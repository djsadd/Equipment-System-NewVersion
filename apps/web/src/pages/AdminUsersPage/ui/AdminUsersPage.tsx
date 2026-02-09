import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  createAdminRole,
  createAdminUser,
  deleteAdminRole,
  deleteAdminUser,
  listAdminPermissions,
  listAdminRoles,
  listAdminUsers,
  type AdminUserCreatePayload,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
  updateAdminRole,
  updateAdminUser,
} from '@/shared/api/admin'
import { listDepartments, type Department } from '@/shared/api/departments'

type AdminTab = 'users' | 'roles' | 'permissions'
type ModalState =
  | { type: 'user'; item: AdminUser }
  | { type: 'role'; item: AdminRole }
  | { type: 'permission'; item: AdminPermission }
  | { type: 'user-create' }
  | { type: 'user-edit'; item: AdminUser }
  | { type: 'role-create' }
  | { type: 'role-edit'; item: AdminRole }
  | null

const SYSTEM_ADMIN_ROLE = 'system_admin'

function getUserDisplayName(user: AdminUser) {
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

function getDepartmentLabel(
  user: AdminUser,
  departmentsById: Map<number, Department>
): string {
  if (!user.department_id) {
    return '—'
  }
  const department = departmentsById.get(user.department_id)
  return department ? department.name : `Отдел #${user.department_id}`
}

export function AdminUsersPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const loadData = () => {
    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()])
      .then(([usersData, rolesData, permissionsData]) => {
        if (!active) {
          return
        }
        setUsers(usersData)
        setRoles(rolesData)
        setPermissions(permissionsData)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }

  useEffect(() => {
    return loadData()
  }, [])

  useEffect(() => {
    let active = true
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    listDepartments()
      .then((data) => {
        if (!active) {
          return
        }
        if (!Array.isArray(data)) {
          throw new Error('Некорректный ответ сервиса департаментов')
        }
        setDepartments(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setDepartmentsError(err instanceof Error ? err.message : 'Не удалось загрузить департаменты')
      })
      .finally(() => {
        if (active) {
          setDepartmentsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const totalUsers = users.length
  const totalRoles = roles.length
  const totalPermissions = permissions.length
  const adminCount = users.filter((user) =>
    user.roles.includes(SYSTEM_ADMIN_ROLE)
  ).length

  const roleUserCount = useMemo(() => {
    const counts = new Map<string, number>()
    users.forEach((user) => {
      user.roles.forEach((roleName) => {
        counts.set(roleName, (counts.get(roleName) ?? 0) + 1)
      })
    })
    return counts
  }, [users])

  const departmentsById = useMemo(() => {
    return new Map(departments.map((item) => [item.id, item]))
  }, [departments])

  const openUserCreate = () => {
    setActionError(null)
    setModal({ type: 'user-create' })
  }

  const openRoleCreate = () => {
    setActionError(null)
    setModal({ type: 'role-create' })
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Удалить пользователя?')) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteAdminUser(userId)
      await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
        ([usersData, rolesData, permissionsData]) => {
          setUsers(usersData)
          setRoles(rolesData)
          setPermissions(permissionsData)
        }
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить пользователя')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Удалить роль?')) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteAdminRole(roleId)
      await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
        ([usersData, rolesData, permissionsData]) => {
          setUsers(usersData)
          setRoles(rolesData)
          setPermissions(permissionsData)
        }
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить роль')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="dashboard">
      <Sidebar
        lang={lang}
        onLangChange={(nextLang) => {
          localStorage.setItem('dashboard_lang', nextLang)
          setLang(nextLang)
          window.location.reload()
        }}
        reportsOpen={reportsOpen}
        onToggleReports={() => setReportsOpen((prev) => !prev)}
        copy={t}
        active="admin"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="admin">
          <header className="admin__header">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Пользователи</span>
              </nav>
              <h1>Пользователи, роли и разрешения</h1>
              <p>Создание, редактирование, просмотр и удаление доступов.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/dashboard')}>
                Вернуться в кабинет
              </button>
              {activeTab === 'users' && (
                <button type="button" className="is-primary">
                  <span onClick={openUserCreate}>Добавить пользователя</span>
                </button>
              )}
              {activeTab === 'roles' && (
                <button type="button" className="is-primary">
                  <span onClick={openRoleCreate}>Создать роль</span>
                </button>
              )}
              {activeTab === 'permissions' && (
                <button type="button" className="is-primary">
                  Создать разрешение
                </button>
              )}
            </div>
          </header>

          <section className="admin__tabs">
            <button
              type="button"
              className={activeTab === 'users' ? 'is-active' : undefined}
              onClick={() => setActiveTab('users')}
            >
              Пользователи
            </button>
            <button
              type="button"
              className={activeTab === 'roles' ? 'is-active' : undefined}
              onClick={() => setActiveTab('roles')}
            >
              Роли
            </button>
            <button
              type="button"
              className={activeTab === 'permissions' ? 'is-active' : undefined}
              onClick={() => setActiveTab('permissions')}
            >
              Разрешения
            </button>
          </section>

          <section className="admin__summary">
            <div>
              <div className="admin__summary-value">{totalUsers}</div>
              <div className="admin__summary-label">Всего пользователей</div>
            </div>
            <div>
              <div className="admin__summary-value">{totalRoles}</div>
              <div className="admin__summary-label">Активные роли</div>
            </div>
            <div>
              <div className="admin__summary-value">{totalPermissions}</div>
              <div className="admin__summary-label">Разрешения</div>
            </div>
            <div>
              <div className="admin__summary-value">{adminCount}</div>
              <div className="admin__summary-label">Администраторы</div>
            </div>
          </section>

          <section className="admin__grid" key={activeTab}>
            {activeTab === 'users' && (
              <article className="admin__card">
                <div className="admin__table-head">
                  <div>
                    <h2>Пользователи</h2>
                    <span>Управление учетными записями и назначениями.</span>
                  </div>
                  <button type="button">Список</button>
                </div>
                <div className="admin__table">
                  {isLoading && <p>Загрузка пользователей...</p>}
                  {!isLoading && error && <p>{error}</p>}
                  {!isLoading &&
                    !error &&
                    users.map((user) => (
                      <div className="admin__row" key={user.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{getUserDisplayName(user)}</div>
                          <div className="admin__row-sub">{user.email}</div>
                          <div className="admin__row-tags">
                            {user.roles.map((role) => (
                              <span className="admin__status" key={role}>
                                {role}
                              </span>
                            ))}
                            <span className="admin__status">
                              {user.is_active ? 'Активен' : 'Приостановлен'}
                            </span>
                          </div>
                        </div>
                        <div className="admin__row-actions">
                          <button type="button" onClick={() => setModal({ type: 'user', item: user })}>
                            Просмотр
                          </button>
                          <button type="button" onClick={() => setModal({ type: 'user-edit', item: user })}>
                            Редактировать
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => handleDeleteUser(user.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  {actionError && <p>{actionError}</p>}
                </div>
              </article>
            )}

            {activeTab === 'roles' && (
              <article className="admin__card">
                <div className="admin__table-head">
                  <div>
                    <h2>Роли</h2>
                    <span>Настройка ролей и их набора разрешений.</span>
                  </div>
                  <button type="button">Управлять</button>
                </div>
                <div className="admin__table">
                  {isLoading && <p>Загрузка ролей...</p>}
                  {!isLoading && error && <p>{error}</p>}
                  {!isLoading &&
                    !error &&
                    roles.map((role) => (
                      <div className="admin__row" key={role.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{role.name}</div>
                          <div className="admin__row-sub">
                            {role.permissions.length} разрешений ·{' '}
                            {roleUserCount.get(role.name) ?? 0} пользователей
                          </div>
                        </div>
                        <div className="admin__row-actions">
                          <button type="button" onClick={() => setModal({ type: 'role', item: role })}>
                            Просмотр
                          </button>
                          <button type="button" onClick={() => setModal({ type: 'role-edit', item: role })}>
                            Редактировать
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => handleDeleteRole(role.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  {actionError && <p>{actionError}</p>}
                </div>
              </article>
            )}

            {activeTab === 'permissions' && (
              <article className="admin__card">
                <div className="admin__table-head">
                  <div>
                    <h2>Разрешения</h2>
                    <span>Гранулярные права для ролей и модулей.</span>
                  </div>
                  <button type="button">Каталог</button>
                </div>
                <div className="admin__table">
                  {isLoading && <p>Загрузка разрешений...</p>}
                  {!isLoading && error && <p>{error}</p>}
                  {!isLoading &&
                    !error &&
                    permissions.map((permission) => (
                      <div className="admin__row" key={permission.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{permission.name}</div>
                          <div className="admin__row-sub">{permission.description}</div>
                        </div>
                        <div className="admin__row-actions">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'permission', item: permission })}
                          >
                            Просмотр
                          </button>
                          <button type="button">Редактировать</button>
                          <button type="button">Удалить</button>
                        </div>
                      </div>
                    ))}
                </div>
              </article>
            )}
          </section>
        </section>
      </main>

      {modal && (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="modal__close"
              onClick={() => setModal(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            {modal.type === 'user' && (
              <>
                <h2>{getUserDisplayName(modal.item)}</h2>
                <p>{modal.item.email}</p>
                <div className="room__modal-grid">
                  <span>Статус</span>
                  <strong>{modal.item.is_active ? 'Активен' : 'Приостановлен'}</strong>
                  <span>Роли</span>
                  <strong>{modal.item.roles.join(', ') || '—'}</strong>
                  <span>Разрешения</span>
                  <strong>{modal.item.permissions.join(', ') || '—'}</strong>
                  <span>Отдел</span>
                  <strong>{getDepartmentLabel(modal.item, departmentsById)}</strong>
                  <span>Создан</span>
                  <strong>{modal.item.created_at ?? '—'}</strong>
                </div>
              </>
            )}
            {modal.type === 'role' && (
              <>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.description || 'Описание отсутствует'}</p>
                <div className="room__modal-grid">
                  <span>Разрешения</span>
                  <strong>
                    {modal.item.permissions.map((permission) => permission.name).join(', ') || '—'}
                  </strong>
                  <span>Пользователи</span>
                  <strong>{roleUserCount.get(modal.item.name) ?? 0}</strong>
                </div>
              </>
            )}
            {modal.type === 'permission' && (
              <>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.description || 'Описание отсутствует'}</p>
              </>
            )}
            {modal.type === 'user-create' && (
              <UserForm
                roles={roles}
                departments={departments}
                departmentsLoading={departmentsLoading}
                departmentsError={departmentsError}
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  if (!payload.email || !payload.password) {
                    setActionError('Email и пароль обязательны для создания пользователя')
                    return
                  }
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    const createPayload: AdminUserCreatePayload = {
                      email: payload.email,
                      password: payload.password,
                      full_name: payload.full_name ?? undefined,
                      first_name: payload.first_name ?? undefined,
                      last_name: payload.last_name ?? undefined,
                      department_id: payload.department_id ?? undefined,
                      role: payload.role ?? undefined,
                      is_active: payload.is_active,
                      role_ids: payload.role_ids ?? undefined,
                    }
                    await createAdminUser(createPayload)
                    await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
                      ([usersData, rolesData, permissionsData]) => {
                        setUsers(usersData)
                        setRoles(rolesData)
                        setPermissions(permissionsData)
                      }
                    )
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось создать пользователя')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
              />
            )}
            {modal.type === 'user-edit' && (
              <UserForm
                roles={roles}
                initial={modal.item}
                departments={departments}
                departmentsLoading={departmentsLoading}
                departmentsError={departmentsError}
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    await updateAdminUser(modal.item.id, payload)
                    await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
                      ([usersData, rolesData, permissionsData]) => {
                        setUsers(usersData)
                        setRoles(rolesData)
                        setPermissions(permissionsData)
                      }
                    )
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось обновить пользователя')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
                mode="edit"
              />
            )}
            {modal.type === 'role-create' && (
              <RoleForm
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    await createAdminRole(payload)
                    await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
                      ([usersData, rolesData, permissionsData]) => {
                        setUsers(usersData)
                        setRoles(rolesData)
                        setPermissions(permissionsData)
                      }
                    )
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось создать роль')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
              />
            )}
            {modal.type === 'role-edit' && (
              <RoleForm
                initial={modal.item}
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    await updateAdminRole(modal.item.id, payload)
                    await Promise.all([listAdminUsers(), listAdminRoles(), listAdminPermissions()]).then(
                      ([usersData, rolesData, permissionsData]) => {
                        setUsers(usersData)
                        setRoles(rolesData)
                        setPermissions(permissionsData)
                      }
                    )
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось обновить роль')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
                mode="edit"
              />
            )}
            {(modal.type === 'user' ||
              modal.type === 'role' ||
              modal.type === 'permission') && (
              <div className="inventory__actions">
                <button type="button" onClick={() => setModal(null)}>
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type UserFormProps = {
  roles: AdminRole[]
  initial?: AdminUser
  mode?: 'create' | 'edit'
  departments?: Department[]
  departmentsLoading?: boolean
  departmentsError?: string | null
  onSubmit: (payload: {
    email?: string | null
    password?: string | null
    full_name?: string | null
    first_name?: string | null
    last_name?: string | null
    department_id?: number | null
    role?: string | null
    is_active?: boolean
    role_ids?: number[] | null
  }) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

function UserForm({
  roles,
  initial,
  mode = 'create',
  departments,
  departmentsLoading,
  departmentsError,
  onSubmit,
  onCancel,
  busy,
  error,
}: UserFormProps) {
  const [email, setEmail] = useState(initial?.email ?? '')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [firstName, setFirstName] = useState(initial?.first_name ?? '')
  const [lastName, setLastName] = useState(initial?.last_name ?? '')
  const [departmentId, setDepartmentId] = useState(
    initial?.department_id ? String(initial.department_id) : ''
  )
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [showDepartmentList, setShowDepartmentList] = useState(false)
  const [role, setRole] = useState(initial?.role ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [roleIds, setRoleIds] = useState<number[]>(() => {
    if (!initial) {
      return []
    }
    return roles.filter((r) => initial.roles.includes(r.name)).map((r) => r.id)
  })

  const toggleRole = (roleId: number) => {
    setRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    )
  }

  const departmentsById = useMemo(() => {
    return new Map((departments ?? []).map((item) => [item.id, item]))
  }, [departments])

  const filteredDepartments = useMemo(() => {
    const list = departments ?? []
    const query = departmentSearch.trim().toLowerCase()
    const filtered = query
      ? list.filter((item) => item.name.toLowerCase().includes(query))
      : list
    return filtered.slice(0, 8)
  }, [departments, departmentSearch])

  useEffect(() => {
    if (!departmentSearch && departmentId && departmentsById.size > 0) {
      const resolved = departmentsById.get(Number(departmentId))
      if (resolved) {
        setDepartmentSearch(resolved.name)
      }
    }
  }, [departmentId, departmentSearch, departmentsById])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      email: email || undefined,
      password: password || undefined,
      full_name: fullName || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      department_id: departmentId ? Number(departmentId) : undefined,
      role: role || undefined,
      is_active: isActive,
      role_ids: roleIds,
    }
    if (mode === 'edit') {
      if (!payload.password) {
        delete payload.password
      }
      onSubmit(payload)
      return
    }
    onSubmit(payload)
  }

  return (
    <form className="admin__form" onSubmit={handleSubmit}>
      <h2>{mode === 'edit' ? 'Редактировать пользователя' : 'Создать пользователя'}</h2>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required={mode === 'create'}
        />
      </label>
      <label>
        Полное имя
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </label>
      <label>
        Имя
        <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
      </label>
      <label>
        Фамилия
        <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
      </label>
      <label>
        Отдел
        <div className="inventory-user-picker">
          <input
            value={departmentSearch}
            onChange={(event) => {
              setDepartmentSearch(event.target.value)
              setDepartmentId('')
              setShowDepartmentList(true)
            }}
            onFocus={() => setShowDepartmentList(true)}
            onBlur={() => {
              window.setTimeout(() => setShowDepartmentList(false), 120)
            }}
            placeholder="Начните вводить название отдела"
          />
          {departmentsLoading ? (
            <span className="inventory-user-picker__hint">Загрузка отделов...</span>
          ) : null}
          {departmentsError ? (
            <span className="inventory-user-picker__error">{departmentsError}</span>
          ) : null}
          {departmentId && departmentsById.get(Number(departmentId)) ? (
            <span className="inventory-user-picker__value">
              Выбран: {departmentsById.get(Number(departmentId))?.name}
            </span>
          ) : null}
          {showDepartmentList && filteredDepartments.length > 0 ? (
            <div className="inventory-user-picker__list">
              {filteredDepartments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="inventory-user-picker__option"
                  onMouseDown={() => {
                    setDepartmentId(String(item.id))
                    setDepartmentSearch(item.name)
                    setShowDepartmentList(false)
                  }}
                >
                  <span className="inventory-user-picker__name">{item.name}</span>
                  <span className="inventory-user-picker__meta">ID: {item.id}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </label>
      <label>
        Должность
        <input value={role} onChange={(event) => setRole(event.target.value)} />
      </label>
      <label>
        Статус
        <select value={isActive ? 'active' : 'inactive'} onChange={(event) => setIsActive(event.target.value === 'active')}>
          <option value="active">Активен</option>
          <option value="inactive">Приостановлен</option>
        </select>
      </label>
      <div>
        <strong>Роли</strong>
        {roles.length === 0 && <p>Роли не найдены</p>}
        {roles.map((item) => (
          <label key={item.id} style={{ display: 'block', marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={roleIds.includes(item.id)}
              onChange={() => toggleRole(item.id)}
            />{' '}
            {item.name}
          </label>
        ))}
      </div>
      {error && <p>{error}</p>}
      <div className="inventory__actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="is-primary" disabled={busy}>
          {mode === 'edit' ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}

type RoleFormProps = {
  initial?: AdminRole
  mode?: 'create' | 'edit'
  onSubmit: (payload: { name: string; description?: string | null }) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

function RoleForm({ initial, mode = 'create', onSubmit, onCancel, busy, error }: RoleFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      name,
      description: description || undefined,
    })
  }

  return (
    <form className="admin__form" onSubmit={handleSubmit}>
      <h2>{mode === 'edit' ? 'Редактировать роль' : 'Создать роль'}</h2>
      <label>
        Название роли
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {error && <p>{error}</p>}
      <div className="inventory__actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="is-primary" disabled={busy}>
          {mode === 'edit' ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
