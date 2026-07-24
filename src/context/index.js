'use client'

import React, { useCallback, useState, useMemo, useRef, useContext } from 'react'

const UserContext = React.createContext()

export function UserProvider({ children }) {

	const [user, setUser] = useState(undefined)
	const [servicios, setServicios] = useState(undefined)
	const [perfil, setPerfil] = useState(undefined)

	const [sucursales, setSucursales] = useState(undefined)
	const [personal, setPersonal] = useState(undefined)
	const [clientes, setClientes] = useState(undefined)
	const [tareas, setTareas] = useState(undefined)

	const [userDB, setUserDB] = useState(undefined)
	const [distributorPDB, setDistributorPDB] = useState(undefined)
	const [productDB, setProduct] = useState(undefined)
	const [item, setItem] = useState(undefined)
	const [cart, setCart] = useState({})
	const [success, setSuccess] = useState(null)
	const [pedidos, setPedidos] = useState([])

	const [pendientes, setPendientes,] = useState(undefined)
	const [qr, setQr] = useState('');
	const [QRurl, setQRurl] = useState('');
	const [recetaDB, setRecetaDB] = useState({});
	const [filter, setFilter] = useState('');
	const [filterQR, setFilterQR] = useState('');
	const [pendienteDB, setPendienteDB] = useState(undefined);
	const [nav, setNav] = useState(false)
	const [temporal, setTemporal] = useState(undefined)
	const [userUuid, setUserUuid] = useState(undefined)
	const [modal, setModal] = useState('')
	const [msg, setMsg] = useState('')
	const [tienda, setTienda] = useState(undefined)
	const timer = useRef(null);

	const videoRef = useRef();
	const [play, setPlay] = useState(true)
	const [sound, setSound] = useState(false)
	const [introVideo, setUserIntroVideo] = useState(undefined)

	const videoClientRef = useRef();
	const [soundClient, setSoundClient] = useState(false)
	const [introClientVideo, setUserIntroClientVideo] = useState(undefined)
	const [search, setSearch] = useState(false)
	const [sound1, setSound1] = useState(false)
	const [sound2, setSound2] = useState(false)
	const [whatsapp, setWhatsapp] = useState(false)
	const [whatsappMSG, setWhatsappMSG] = useState('')
	const [state, setState] = useState({})
	const [webScann, setWebScann] = useState(false)
	const [businessData, setBusinessData] = useState(undefined)
	const [qrBCP, setQrBCP] = useState(undefined)
	const [paySuccess, setPaySuccess] = useState(undefined)
	const [filterDis, setFilterDis] = useState('')

	const setUserProfile = useCallback((data) => {
		setUser(data)
	}, [])
	const setUserData = useCallback((data) => {
		setUserDB(data)
	}, [])
	const setUserDistributorPDB = (data) => {
		setDistributorPDB(data)
	}
	const setUserProduct = (data) => {
		setProduct(data)
	}
	const setUserPedidos = (data) => {
		setPedidos(data)
	}
	const setUserCart = (data) => {
		setCart(data)
	}
	const setUserItem = (data) => {
		setItem(data)
	}
	const setUserSuccess = (data, time) => {
		if (timer.current) clearTimeout(timer.current)
		setSuccess(data)
		if (data !== null && data !== '') {
			timer.current = setTimeout(() => setSuccess(null), time || 6000)
		}
	}
	const setIntroVideo = (data) => {
		setUserIntroVideo(data)
	}



	const setIntroClientVideo = (data) => {
		setUserIntroClientVideo(data)
	}

	const value = useMemo(() => {
		return ({
			user,
			userDB,
			distributorPDB,
			productDB,
			pedidos,
			item,
			cart,
			success,
			qr,
			QRurl,
			recetaDB,
			filter,
			filterQR,
			pendienteDB,
			nav,
			userUuid,
			modal,
			msg,
			tienda,
			introVideo,
			play,
			sound,
			videoRef,
			state,
			videoClientRef,
			soundClient,
			introClientVideo, search,
			sound1,
			sound2,
			whatsapp,
			whatsappMSG,
			businessData,
			webScann,
			qrBCP, paySuccess, filterDis,
			pendientes, setPendientes,
			servicios, setServicios,
			sucursales, setSucursales,
			personal, setPersonal,
			clientes, setClientes,
			tareas, setTareas,
			perfil, setPerfil,
			setFilterDis,
			setPaySuccess, setQrBCP,
			setWebScann,
			setBusinessData,
			setWhatsappMSG,
			setWhatsapp,
			setSound2,
			setSound1,
			setSearch,
			setIntroClientVideo,
			setSoundClient,
			setState,
			setSound,
			setPlay,
			setIntroVideo,
			setTienda,
			setMsg,
			setModal,
			setUserUuid,
			temporal,
			setTemporal,
			setNav,
			setPendienteDB,
			setFilterQR,
			setFilter,
			setRecetaDB,
			setQRurl,
			setQr,
			setUserProfile,
			setUserData,
			setUserCart,
			setUserDistributorPDB,
			setUserProduct,
			setUserPedidos,
			setUserSuccess,
			setUserItem
		})
	}, [user, userDB, distributorPDB, productDB, pedidos, item, cart, success, qr, QRurl, recetaDB, filter, filterQR, pendienteDB, nav, temporal, userUuid, modal, msg, tienda, introVideo, play, sound, state, videoClientRef,
		soundClient,
		introClientVideo,
		search,
		sound1,
		sound2, whatsapp,
		businessData,
		webScann,
		qrBCP,
		paySuccess, filterDis,
		servicios,
		sucursales,
		personal,
		clientes,
		pendientes,
		tareas, perfil
	])

	return (
		<UserContext.Provider value={value} >
			{children}
		</UserContext.Provider>
	)
}

export function useUser() {
	const context = useContext(UserContext)
	if (!context) {
		throw new Error('error')
	}
	return context
}
