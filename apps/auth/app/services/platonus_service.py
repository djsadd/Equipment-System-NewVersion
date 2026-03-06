from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from app.core.config import settings


@dataclass(frozen=True, slots=True)
class PlatonusAuthResult:
    username: str
    person_id: str
    primary_role: str
    roles: list[str]
    info: dict[str, Any]


class PlatonusAuthError(RuntimeError):
    pass


def _normalize_role(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def _debug_log(message: str, **fields: object) -> None:
    if not settings.platonus_debug:
        return
    safe_parts: list[str] = [message]
    for key, value in fields.items():
        try:
            rendered = str(value)
        except Exception:
            rendered = "<unprintable>"
        if len(rendered) > 800:
            rendered = rendered[:800] + "…"
        safe_parts.append(f"{key}={rendered}")
    print("[platonus]", " ".join(safe_parts))


def _get_token(page) -> str:
    # Token location in Platonus may vary by deployment/version.
    expr = (
        "() => ("
        "localStorage.getItem('token') || localStorage.getItem('access_token') || "
        "sessionStorage.getItem('token') || sessionStorage.getItem('access_token') || ''"
        ")"
    )
    try:
        return str(page.evaluate(expr) or "")
    except PlaywrightError:
        page.wait_for_load_state("domcontentloaded")
        return str(page.evaluate(expr) or "")


def _wait_for_auth_artifacts(page, base_url: str, timeout_ms: int) -> tuple[dict[str, str], str]:
    deadline = time.monotonic() + (timeout_ms / 1000.0)
    last_cookie_map: dict[str, str] = {}
    last_token = ""
    while True:
        cookies = page.context.cookies(base_url)
        last_cookie_map = {cookie["name"]: cookie["value"] for cookie in cookies}
        last_token = _get_token(page)
        if last_cookie_map.get("plt_sid") or last_cookie_map.get("sid") or last_token:
            return last_cookie_map, last_token
        if time.monotonic() >= deadline:
            return last_cookie_map, last_token
        page.wait_for_timeout(250)


def authenticate(username: str, password: str) -> PlatonusAuthResult:
    base_url = settings.platonus_base_url
    timeout_ms = settings.platonus_timeout_ms

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=settings.platonus_headless)
        page = browser.new_page()
        page.set_default_timeout(timeout_ms)

        try:
            page.goto(f"{base_url}/mail?type=1", wait_until="domcontentloaded")

            try:
                page.wait_for_selector("#login_input", state="visible")
                page.fill("#login_input", username)
                page.fill("#pass_input", password)
            except PlaywrightTimeoutError as exc:
                raise PlatonusAuthError("platonus_login_form_timeout") from exc

            page.click("#Submit1")
            page.wait_for_load_state("networkidle")

            cookie_map, token_value = _wait_for_auth_artifacts(page, base_url, min(timeout_ms, 5000))
            cookies = page.context.cookies(base_url)
            cookie_header = "; ".join(f"{cookie['name']}={cookie['value']}" for cookie in cookies)
            user_agent = page.evaluate("() => navigator.userAgent")
            sid_value = cookie_map.get("plt_sid") or cookie_map.get("sid") or ""
            token_value = token_value.strip()

            headers = {
                "cookie": cookie_header,
                "sid": sid_value,
                "token": token_value,
                "user-agent": user_agent,
                "accept": "application/json",
                "accept-language": "ru",
                "referer": f"{base_url}/",
                "origin": base_url,
                "x-requested-with": "XMLHttpRequest",
            }
            if token_value:
                headers["authorization"] = token_value if token_value.lower().startswith("bearer ") else f"Bearer {token_value}"

            _debug_log(
                "after_login",
                url=page.url,
                sid_present=bool(sid_value),
                token_present=bool(token_value),
                cookie_names=",".join(sorted(cookie_map.keys())),
            )

            person_id_response = page.request.get(f"{base_url}/rest/api/person/personID", headers=headers)
            try:
                person_data = person_id_response.json()
            except ValueError as exc:
                _debug_log(
                    "personID_not_json",
                    status=person_id_response.status,
                    text=person_id_response.text(),
                )
                raise PlatonusAuthError("platonus_person_id_not_json") from exc

            person_id = str(person_data.get("personID") or "").strip()
            if not person_id:
                person_id_retry = page.request.get(f"{base_url}/rest/api/person/personID", headers=headers)
                try:
                    person_data_retry = person_id_retry.json()
                except ValueError as exc:
                    _debug_log(
                        "personID_retry_not_json",
                        status=person_id_retry.status,
                        text=person_id_retry.text(),
                    )
                    raise PlatonusAuthError("platonus_person_id_retry_not_json") from exc
                person_id = str(person_data_retry.get("personID") or "").strip()
            if not person_id:
                _debug_log(
                    "personID_missing",
                    status=person_id_response.status,
                    response=person_data,
                    retry_status=person_id_retry.status if "person_id_retry" in locals() else None,
                    retry_response=person_data_retry if "person_data_retry" in locals() else None,
                )
                raise PlatonusAuthError("platonus_person_id_missing")

            roles_response = page.request.get(f"{base_url}/rest/api/person/roles", headers=headers)
            try:
                roles_data = roles_response.json()
            except ValueError as exc:
                _debug_log(
                    "roles_not_json",
                    status=roles_response.status,
                    text=roles_response.text(),
                )
                raise PlatonusAuthError("platonus_roles_not_json") from exc

            role_names = [
                _normalize_role(role.get("name", ""))
                for role in roles_data
                if isinstance(role, dict)
            ]
            role_names = [r for r in role_names if r]

            if "студент" in role_names:
                info_response = page.request.get(
                    f"{base_url}/rest/student/studentInfo/{person_id}/ru",
                    headers=headers,
                )
                primary_role = "студент"
            elif "преподаватель" in role_names or "библиотека" in role_names:
                info_response = page.request.get(
                    f"{base_url}/rest/employee/employeeInfo/{person_id}/3/ru?dn=1",
                    headers=headers,
                )
                primary_role = "преподаватель" if "преподаватель" in role_names else "библиотека"
            elif "деканат" in role_names:
                raise PlatonusAuthError("platonus_role_temporarily_disabled")
            else:
                raise PlatonusAuthError("platonus_role_not_supported")

            try:
                info = info_response.json()
            except ValueError as exc:
                raise PlatonusAuthError("platonus_info_not_json") from exc
            if not isinstance(info, dict):
                raise PlatonusAuthError("platonus_info_invalid")

            return PlatonusAuthResult(
                username=username,
                person_id=person_id,
                primary_role=primary_role,
                roles=role_names,
                info=info,
            )
        finally:
            browser.close()
