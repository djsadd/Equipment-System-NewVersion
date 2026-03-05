import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginPlatonus, loginUser, registerUser } from '@/shared/api/auth'
import { saveTokens } from '@/shared/lib/authStorage'
import { ensureSession } from '@/shared/lib/authSession'

type Lang = 'ru' | 'en' | 'kk'
type Mode = 'login' | 'register'
type LoginMethod = 'email' | 'platonus'

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Система управления оборудованием',
    subtitle: 'Авторизация',
    loginTab: 'Вход',
    registerTab: 'Регистрация',
    emailMethod: 'Email',
    platonusMethod: 'Platonus',
    email: 'Email',
    username: 'Login',
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
    emailMethod: 'Email',
    platonusMethod: 'Platonus',
    email: 'Email',
    username: 'Username',
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
    emailMethod: 'Email',
    platonusMethod: 'Platonus',
    email: 'Email',
    username: 'Логин',
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
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [platonusUsername, setPlatonusUsername] = useState('')
  const [platonusPassword, setPlatonusPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const t = useMemo(() => translations[lang], [lang])

  useEffect(() => {
    ensureSession()
      .then((ok) => {
        if (ok) {
          navigate('/profile')
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
            onClick={() => {
              setMode('register')
              setLoginMethod('email')
            }}
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
              const tokens =
                mode === 'login' && loginMethod === 'platonus'
                  ? await loginPlatonus({ username: platonusUsername, password: platonusPassword })
                  : await loginUser({ email, password })
              saveTokens({
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenType: tokens.token_type,
                accessExpiresAt: tokens.access_expires_at,
                refreshExpiresAt: tokens.refresh_expires_at,
              })
              navigate('/profile')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Ошибка')
            } finally {
              setIsLoading(false)
            }
          }}
        >
          {mode === 'login' ? (
            <div className="auth__tabs" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={loginMethod === 'email' ? 'is-active' : undefined}
                onClick={() => setLoginMethod('email')}
              >
                {t.emailMethod}
              </button>
              <button
                type="button"
                className={loginMethod === 'platonus' ? 'is-active' : undefined}
                onClick={() => setLoginMethod('platonus')}
              >
                {t.platonusMethod}
              </button>
            </div>
          ) : null}

          {mode === 'login' && loginMethod === 'platonus' ? (
            <label className="auth__field">
              <span>{t.username}</span>
              <input
                type="text"
                name="username"
                placeholder={t.username}
                value={platonusUsername}
                onChange={(event) => setPlatonusUsername(event.target.value)}
              />
            </label>
          ) : (
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
          )}
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
              value={mode === 'login' && loginMethod === 'platonus' ? platonusPassword : password}
              onChange={(event) => {
                if (mode === 'login' && loginMethod === 'platonus') {
                  setPlatonusPassword(event.target.value)
                } else {
                  setPassword(event.target.value)
                }
              }}
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
