from __future__ import annotations

from dataclasses import dataclass
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

            cookies = page.context.cookies(base_url)
            cookie_map = {cookie["name"]: cookie["value"] for cookie in cookies}
            cookie_header = "; ".join(f"{cookie['name']}={cookie['value']}" for cookie in cookies)
            user_agent = page.evaluate("() => navigator.userAgent")
            sid_value = cookie_map.get("plt_sid") or cookie_map.get("sid") or ""

            try:
                token_value = page.evaluate(
                    "() => localStorage.getItem('token') || localStorage.getItem('access_token') || ''"
                )
            except PlaywrightError:
                page.wait_for_load_state("domcontentloaded")
                token_value = page.evaluate(
                    "() => localStorage.getItem('token') || localStorage.getItem('access_token') || ''"
                )

            headers = {
                "cookie": cookie_header,
                "sid": sid_value,
                "token": token_value,
                "user-agent": user_agent,
                "accept": "application/json",
                "accept-language": "kz",
            }

            person_id_response = page.request.get(f"{base_url}/rest/api/person/personID", headers=headers)
            try:
                person_data = person_id_response.json()
            except ValueError as exc:
                raise PlatonusAuthError("platonus_person_id_not_json") from exc

            person_id = str(person_data.get("personID") or "").strip()
            if not person_id:
                person_id_retry = page.request.get(f"{base_url}/rest/api/person/personID", headers=headers)
                try:
                    person_data_retry = person_id_retry.json()
                except ValueError as exc:
                    raise PlatonusAuthError("platonus_person_id_retry_not_json") from exc
                person_id = str(person_data_retry.get("personID") or "").strip()
            if not person_id:
                raise PlatonusAuthError("platonus_person_id_missing")

            roles_response = page.request.get(f"{base_url}/rest/api/person/roles", headers=headers)
            try:
                roles_data = roles_response.json()
            except ValueError as exc:
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

