import qrcodeParser from 'qrcode-parser'
import { ordersRepository } from '@/features'

async function QRreaderUtils(e, setFilterQR, setFilter, setPendienteDB) {
    const res = await qrcodeParser(e.target.files[0])
    setFilterQR(res)

    if (setPendienteDB) {
        await ordersRepository.resolveQrPath(res, setPendienteDB)
    }
}

export { QRreaderUtils }
