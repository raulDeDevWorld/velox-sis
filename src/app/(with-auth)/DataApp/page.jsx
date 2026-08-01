'use client'

import { uploadStorage } from '@/supabase/storage'
import { settingsRepository } from '@/features'
import { useEffect, useState } from 'react'
import { useUser } from '@/context'
import Input from '@/components/Input'
import Label from '@/components/Label'
import LoaderBlack from '@/components/LoaderBlack'
import Button from '@/components/Button'
import Modal from '@/components/Modal'
import { useMask } from '@react-input/mask'

const catalogConfig = {
    categories: {
        title: 'Categorías de servicio',
        description: 'Agrupan las prendas o servicios para ordenar la UI y reportes.',
        empty: 'No hay categorías registradas.',
        newLabel: 'Nueva categoría',
        placeholder: 'Ej: Ropa formal'
    },
    receptionMethods: {
        title: 'Métodos de recepción',
        description: 'Definen cómo se recibe o mide el servicio: prenda, kilo, par, paquete.',
        empty: 'No hay métodos registrados.',
        newLabel: 'Nuevo método',
        placeholder: 'Ej: Por prenda'
    }
}

function CatalogManager({ kind, items, onSave, onToggle, loading }) {
    const config = catalogConfig[kind]
    const [drafts, setDrafts] = useState({})
    const [newName, setNewName] = useState('')

    useEffect(() => {
        setDrafts(Object.fromEntries((items || []).map((item) => [item.id, {
            name: item.name,
            active: item.active
        }])))
    }, [items])

    const updateDraft = (id, field, value) => {
        setDrafts((current) => ({
            ...current,
            [id]: { ...current[id], [field]: value }
        }))
    }

    const saveNew = async () => {
        await onSave(kind, {
            name: newName,
            sort_order: items.length,
            active: true
        })
        setNewName('')
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-950">{config.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{config.description}</p>
            </div>

            <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_auto]">
                <div>
                    <Label required>{config.newLabel}</Label>
                    <Input
                        name={`${kind}-new-name`}
                        placeholder={config.placeholder}
                        valu={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        require
                    />
                </div>
                <div className="flex items-end">
                    <Button type="button" theme="Primary" disabled={loading || !newName.trim()} click={saveNew}>
                        Agregar
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="admin-table w-full min-w-[720px]">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th className="w-32 text-center">Estado</th>
                            <th className="w-56 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!items.length && (
                            <tr>
                                <td colSpan="3" className="py-10 text-center text-slate-400">{config.empty}</td>
                            </tr>
                        )}

                        {items.map((item) => {
                            const draft = drafts[item.id] || item
                            return (
                                <tr key={item.id}>
                                    <td>
                                        <Input
                                            name={`${kind}-${item.id}-name`}
                                            valu={draft.name}
                                            onChange={(event) => updateDraft(item.id, 'name', event.target.value)}
                                            require
                                        />
                                    </td>
                                    <td className="text-center">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                                disabled={loading || !draft.name?.trim()}
                                                onClick={() => onSave(kind, { ...item, ...draft })}
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                type="button"
                                                className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${item.active ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                                disabled={loading}
                                                onClick={() => onToggle(kind, item.id, !item.active)}
                                            >
                                                {item.active ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function Home() {
    const { user, setUserSuccess, perfil, setPerfil, modal, setModal } = useUser()
    const [business, setBusiness] = useState({
        whatsapp: '',
        adicionalDia: 0,
        adicionalPosterior: 0
    })
    const [catalog, setCatalog] = useState({ categories: [], receptionMethods: [] })
    const [postImage, setPostImage] = useState(null)
    const [urlPostImage, setUrlPostImage] = useState(null)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const inputRefWhatsApp = useMask({ mask: '+ 591 __ ___ ___', replacement: { _: /\d/ } })

    useEffect(() => {
        setBusiness({
            whatsapp: perfil?.whatsapp || '',
            adicionalDia: perfil?.adicionalDia ?? 0,
            adicionalPosterior: perfil?.adicionalPosterior ?? 0
        })
    }, [perfil])

    const loadCatalog = async () => {
        const value = await settingsRepository.getCatalog()
        setCatalog(value)
        return value
    }

    useEffect(() => {
        if (!user) return
        loadCatalog().catch((error) => {
            console.error('Error cargando catálogo:', error)
            setErrorMessage(error.message || 'No se pudo cargar el catálogo.')
            setModal('DataApp Error')
        })
    }, [user])

    const refreshSettings = async () => {
        await settingsRepository.get(setPerfil)
        await loadCatalog()
    }

    const handleBusinessChange = (event) => {
        setBusiness((current) => ({ ...current, [event.target.name]: event.target.value }))
    }

    function manageInputIMG(event) {
        const file = event.target.files[0]
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage('La imagen QR no puede superar 10MB.')
            setModal('DataApp Error')
            return
        }
        setPostImage(file)
        setUrlPostImage(URL.createObjectURL(file))
    }

    const getErrorMessage = (error) => {
        if (error?.code === '42501') return 'No tienes permisos para modificar datos empresariales. Esta acción requiere rol Admin.'
        if (error?.code === '23505') return 'Ya existe un registro con ese nombre.'
        if (error?.message?.includes('Bucket not found')) return 'No existe el bucket public-assets en Supabase Storage.'
        return error?.message || error?.details || error?.hint || 'No se pudo completar la acción.'
    }

    async function saveBusiness(event) {
        event.preventDefault()
        const data = {
            whatsapp: business.whatsapp,
            adicionalDia: Number(business.adicionalDia || 0),
            adicionalPosterior: Number(business.adicionalPosterior || 0),
        }

        try {
            setLoading(true)
            setModal('Guardando')
            if (postImage) {
                await uploadStorage('perfil/', postImage, data)
            } else {
                await settingsRepository.save(data)
            }
            await refreshSettings()
            setPostImage(null)
            setUrlPostImage(null)
            setUserSuccess('Se ha guardado correctamente')
            setModal('')
        } catch (error) {
            console.error('Error guardando datos empresariales:', error)
            setErrorMessage(getErrorMessage(error))
            setModal('DataApp Error')
        } finally {
            setLoading(false)
        }
    }

    const saveCatalogItem = async (kind, item) => {
        try {
            setLoading(true)
            await settingsRepository.saveCatalogItem(kind, item)
            await refreshSettings()
        } catch (error) {
            console.error('Error guardando catálogo:', error)
            setErrorMessage(getErrorMessage(error))
            setModal('DataApp Error')
        } finally {
            setLoading(false)
        }
    }

    const toggleCatalogItem = async (kind, id, active) => {
        try {
            setLoading(true)
            await settingsRepository.toggleCatalogItem(kind, id, active)
            await refreshSettings()
        } catch (error) {
            console.error('Error cambiando estado de catálogo:', error)
            setErrorMessage(getErrorMessage(error))
            setModal('DataApp Error')
        } finally {
            setLoading(false)
        }
    }

    return (
        user && <main className="min-h-full w-full bg-slate-50 p-5">
            {modal === 'Guardando' && <LoaderBlack>{modal}</LoaderBlack>}
            {modal === 'DataApp Error' && <Modal funcion={() => setModal('')} alert={true}>{errorMessage}</Modal>}

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Configuración</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Datos empresariales</h1>
                        <p className="mt-2 text-sm text-slate-500">Administra la información general del negocio. El catálogo operativo se gestiona abajo como entidades independientes.</p>
                    </div>

                    <form className="grid gap-6 lg:grid-cols-[280px_1fr]" onSubmit={saveBusiness}>
                        <div className="flex justify-center lg:justify-start">
                            <label htmlFor="fileUpload" className="flex h-[220px] w-full max-w-[280px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-cyan-300 hover:bg-cyan-50/40" style={{ backgroundImage: `url(${urlPostImage || perfil?.url || ''})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
                                <div className="rounded-xl bg-white/85 p-4 text-center shadow-sm backdrop-blur">
                                    <svg className="mx-auto h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                                    </svg>
                                    <span className="mt-3 block text-sm font-semibold text-cyan-700">Cargar imagen QR</span>
                                    <span className="mt-1 block text-xs text-slate-500">PNG, JPG, WEBP max 10MB</span>
                                    <input id="fileUpload" name="frontPage" onChange={manageInputIMG} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" />
                                </div>
                            </label>
                        </div>

                        <div className="grid content-start gap-5 md:grid-cols-2">
                            <div>
                                <Label required>WhatsApp</Label>
                                <Input type="text" name="whatsapp" onChange={handleBusinessChange} reference={inputRefWhatsApp} valu={business.whatsapp} require />
                            </div>
                            <div>
                                <Label required>Velox del día</Label>
                                <Input type="number" name="adicionalDia" min="0" step="0.01" onChange={handleBusinessChange} valu={business.adicionalDia} require />
                                <p className="mt-1.5 text-xs text-slate-500">Se aplica automáticamente a entregas del mismo día.</p>
                            </div>
                            <div>
                                <Label required>Velox después del día</Label>
                                <Input type="number" name="adicionalPosterior" min="0" step="0.01" onChange={handleBusinessChange} valu={business.adicionalPosterior} require />
                                <p className="mt-1.5 text-xs text-slate-500">Se aplica manualmente a entregas de fechas posteriores.</p>
                            </div>
                            <div className="md:col-span-2">
                                <Button type="submit" theme={loading ? 'Loading' : 'Primary'} disabled={loading}>
                                    Guardar datos empresariales
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>

                <CatalogManager
                    kind="categories"
                    items={catalog.categories}
                    loading={loading}
                    onSave={saveCatalogItem}
                    onToggle={toggleCatalogItem}
                />

                <CatalogManager
                    kind="receptionMethods"
                    items={catalog.receptionMethods}
                    loading={loading}
                    onSave={saveCatalogItem}
                    onToggle={toggleCatalogItem}
                />
            </div>
        </main>
    )
}

export default Home
