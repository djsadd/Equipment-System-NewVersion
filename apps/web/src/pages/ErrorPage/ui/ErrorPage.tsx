import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

type ErrorCopy = {
  title: string
  message: string
  primaryLabel: string
  primaryTo: string
}

const ERROR_COPY: Record<number, ErrorCopy> = {
  401: {
    title: 'Требуется авторизация',
    message: 'У вас нет активной сессии. Войдите, чтобы продолжить работу.',
    primaryLabel: 'Войти',
    primaryTo: '/',
  },
  403: {
    title: 'Доступ запрещён',
    message: 'У вас нет прав для просмотра этой страницы.',
    primaryLabel: 'В кабинет',
    primaryTo: '/dashboard',
  },
  404: {
    title: 'Страница не найдена',
    message: 'Проверьте адрес или вернитесь на главную страницу.',
    primaryLabel: 'На главную',
    primaryTo: '/',
  },
  500: {
    title: 'Ошибка сервера',
    message: 'Что-то пошло не так. Попробуйте обновить страницу позже.',
    primaryLabel: 'На главную',
    primaryTo: '/',
  },
}

type ErrorPageProps = {
  status: 401 | 403 | 404 | 500
}

export function ErrorPage({ status }: ErrorPageProps) {
  const navigate = useNavigate()
  const copy = useMemo(() => ERROR_COPY[status], [status])

  return (
    <div className="error">
      <div className="error__card">
        <div className="error__badge">Ошибка {status}</div>
        <h1>{copy.title}</h1>
        <p>{copy.message}</p>
        <div className="error__actions">
          <button
            className="error__primary"
            type="button"
            onClick={() => navigate(copy.primaryTo, { replace: true })}
          >
            {copy.primaryLabel}
          </button>
          <button className="error__secondary" type="button" onClick={() => navigate(-1)}>
            Назад
          </button>
        </div>
      </div>
      <div className="error__meta">
        <span>Equipment System</span>
        <span>Support: admin@equipment.local</span>
      </div>
    </div>
  )
}
