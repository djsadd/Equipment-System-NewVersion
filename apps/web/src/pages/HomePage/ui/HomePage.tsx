import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '@/shared/api/auth'
import { saveTokens } from '@/shared/lib/authStorage'
import { ensureSession } from '@/shared/lib/authSession'

type Lang = 'ru' | 'en' | 'kk'
type Mode = 'login' | 'register'

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Система управления оборудованием',
    subtitle: 'Авторизация',
    loginTab: 'Вход',
    registerTab: 'Регистрация',
    email: 'Email',
    fullName: 'ФИО',
    password: 'Пароль',
    buttonLogin: 'Войти',
    buttonRegister: 'Зарегистрироваться',
    hint: 'Используйте корпоративный email',
    switcher: 'Язык',
  },
  en: {
    title: 'Equipment Management System',
    subtitle: 'Authentication',
    loginTab: 'Sign in',
    registerTab: 'Register',
    email: 'Email',
    fullName: 'Full name',
    password: 'Password',
    buttonLogin: 'Sign in',
    buttonRegister: 'Create account',
    hint: 'Use your corporate email',
    switcher: 'Language',
  },
  kk: {
    title: 'Жабдықтарды басқару жүйесі',
    subtitle: 'Авторизация',
    loginTab: 'Кіру',
    registerTab: 'Тіркелу',
    email: 'Email',
    fullName: 'Аты-жөні',
    password: 'Құпиясөз',
    buttonLogin: 'Кіру',
    buttonRegister: 'Тіркелу',
    hint: 'Корпоративтік email қолданыңыз',
    switcher: 'Тіл',
  },
}

export function HomePage() {
  const [lang, setLang] = useState<Lang>('ru')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const t = useMemo(() => translations[lang], [lang])

  useEffect(() => {
    ensureSession()
      .then((ok) => {
        if (ok) {
          navigate('/dashboard')
        }
      })
      .catch(() => {
        // ignore
      })
  }, [navigate])

  return (
    <div className="auth">
      <header className="auth__header">
        <h1>{t.title}</h1>
        <div className="auth__switcher">
          <span>{t.switcher}</span>
          <div className="auth__switcher-buttons">
            <button
              type="button"
              className={lang === 'ru' ? 'is-active' : undefined}
              onClick={() => setLang('ru')}
            >
              Рус
            </button>
            <button
              type="button"
              className={lang === 'en' ? 'is-active' : undefined}
              onClick={() => setLang('en')}
            >
              Eng
            </button>
            <button
              type="button"
              className={lang === 'kk' ? 'is-active' : undefined}
              onClick={() => setLang('kk')}
            >
              Қаз
            </button>
          </div>
        </div>
      </header>

      <section className="auth__card">
        <h2>{t.subtitle}</h2>
        <p className="auth__hint">{t.hint}</p>
        <div className="auth__tabs">
          <button
            type="button"
            className={mode === 'login' ? 'is-active' : undefined}
            onClick={() => setMode('login')}
          >
            {t.loginTab}
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'is-active' : undefined}
            onClick={() => setMode('register')}
          >
            {t.registerTab}
          </button>
        </div>
        <form
          className="auth__form"
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            setIsLoading(true)
            try {
              if (mode === 'register') {
                await registerUser({
                  email,
                  password,
                  full_name: fullName || undefined,
                })
              }
              const tokens = await loginUser({ email, password })
              saveTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenType: tokens.token_type,
                accessExpiresAt: tokens.access_expires_at,
                refreshExpiresAt: tokens.refresh_expires_at,
              })
              navigate('/dashboard')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Ошибка')
            } finally {
              setIsLoading(false)
            }
          }}
        >
          <label className="auth__field">
            <span>{t.email}</span>
            <input
              type="email"
              name="email"
              placeholder={t.email}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode === 'register' ? (
            <label className="auth__field">
              <span>{t.fullName}</span>
              <input
                type="text"
                name="full_name"
                placeholder={t.fullName}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          ) : null}
          <label className="auth__field">
            <span>{t.password}</span>
            <input
              type="password"
              name="password"
              placeholder={t.password}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="auth__error">{error}</div> : null}
          <button className="auth__submit" type="submit" disabled={isLoading}>
            {mode === 'login' ? t.buttonLogin : t.buttonRegister}
          </button>
        </form>
      </section>
    </div>
  )
}
