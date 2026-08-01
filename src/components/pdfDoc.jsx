'use client'

import { useEffect, useState } from 'react'
import { Document, Font, Image, Page, PDFDownloadLink, StyleSheet, Text, View } from '@react-pdf/renderer'
import Button from '@/components/Button'
import { createTicketSize, textBlockHeight } from '@/utils/pdfTicketSize'

Font.register({
    family: 'Inter',
    fonts: [
        { src: '/roboto/roboto-v30-latin-300.ttf', fontWeight: 'light' },
        { src: '/roboto/roboto-v30-latin-300italic.ttf', fontStyle: 'italic' },
        { src: '/roboto/roboto-v30-latin-500.ttf', fontWeight: 'bold' },
        { src: '/roboto/roboto-v30-latin-500italic.ttf', fontStyle: 'italic', fontWeight: 'bold' },
    ]
})

const styles = StyleSheet.create({
    page: { padding: '4mm', fontFamily: 'Inter', fontSize: 7, color: '#111827' },
    logo: { marginHorizontal: 'auto', marginBottom: 5, height: 38, width: 96 },
    title: { textAlign: 'center', fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
    branch: { textAlign: 'center', fontSize: 6, marginBottom: 2 },
    code: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    center: { textAlign: 'center', fontSize: 6, marginBottom: 1 },
    section: { marginTop: 8 },
    line: { flexDirection: 'row', marginBottom: 2 },
    key: { width: 68, fontWeight: 'bold', fontStyle: 'italic' },
    value: { flex: 1 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 0.7, borderBottomColor: '#111827', paddingBottom: 2, marginBottom: 2, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.3, borderBottomColor: '#E5E7EB' },
    qty: { width: 28, textAlign: 'center' },
    detail: { flex: 1 },
    price: { width: 50, textAlign: 'right' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
    totalKey: { width: 54, textAlign: 'right', fontWeight: 'bold' },
    totalValue: { width: 50, textAlign: 'right' },
    balanceKey: { width: 54, textAlign: 'right', fontWeight: 'bold', backgroundColor: '#FEF08A' },
    balanceValue: { width: 50, textAlign: 'right', backgroundColor: '#FEF08A' },
    pickup: { marginTop: 6, textAlign: 'center', fontWeight: 'bold' },
    noteTitle: { marginTop: 9, textAlign: 'center', fontWeight: 'bold' },
    note: { marginTop: 2, textAlign: 'center', fontSize: 5 },
})

const values = data => data && typeof data === 'object' ? Object.values(data) : []
const toNumber = value => Number(value || 0)
const itemSubtotal = item => toNumber(item.costo) * toNumber(item.cantidad)
const itemsSubtotal = order => values(order.servicios).reduce((total, item) => total + itemSubtotal(item), 0)
const lineSurchargeTotal = order => order.velox ? 0 : values(order.servicios).reduce((total, item) => total + toNumber(item.adicional) * toNumber(item.cantidad), 0)
const veloxTotal = order => order.velox ? toNumber(order.adicional) : 0
const orderTotal = order => Number.isFinite(Number(order.total)) ? toNumber(order.total) : itemsSubtotal(order) + lineSurchargeTotal(order) + veloxTotal(order) - toNumber(order.descuento)
const codeNumber = code => String(code || '').replace('NUMERO_', '')
const receptionNotes = [
    'La presente orden de trabajo acredita el derecho de propiedad del cliente para el recojo de su prenda.',
    'No nos responsabilizamos por objetos dejados en prendas ni por daños derivados de mala calidad de telas o confección.',
    'En caso de no recoger la prenda dentro del plazo establecido, quedará a disposición de la empresa.',
    '¡GRACIAS POR SU PREFERENCIA!',
    'www.app.lavavelox.com'
]

const ticketSize = (order, includeNotes) => {
    const detailWidth = 121
    const contentWidth = 204
    const fixedHeader = 96 + (order.direccionSucursal ? 10 : 0)
    const customerRows = [order.fecha, order.fecha, order.nombre, order.whatsapp, order.CI]
        .reduce((height, value) => height + Math.max(8.4, textBlockHeight(value, 136, 7)) + 2, 8)
    const itemRows = values(order.servicios).reduce((height, item) => {
        const detail = `${item['nombre 1'] || item.nombre || ''}${item.observacion ? ` · Obs: ${item.observacion}` : ''}`
        return height + Math.max(8.4, textBlockHeight(detail, detailWidth, 7)) + 4.3
    }, 0)
    const totalRows = 4 + (lineSurchargeTotal(order) > 0 ? 1 : 0) + (veloxTotal(order) > 0 ? 1 : 0) + (toNumber(order.descuento) > 0 ? 1 : 0)
    const pickupRows = [order['fecha para recojo'], order['hora para recojo'], order.velox].filter(Boolean).length
    const notesHeight = includeNotes
        ? 17.4 + receptionNotes.reduce((height, note) => height + 2 + textBlockHeight(note, contentWidth, 5), 0)
        : 0
    const contentHeight = fixedHeader + customerRows + 21 + itemRows + 8 + totalRows * 10.4 + pickupRows * 14.4 + notesHeight

    // La segunda copia necesita únicamente compensar el padding inferior que no
    // forma parte del contenido medido. La primera copia conserva su tamaño actual.
    const safetyMargin = includeNotes ? 14 : 22
    return createTicketSize(contentHeight, { minimumHeight: 280, safetyMargin })
}

function receptionDateParts(order) {
    if (order.fecha && String(order.fecha).includes('T')) {
        const date = new Date(order.fecha)
        if (!Number.isNaN(date.getTime())) {
            return {
                date: date.toLocaleDateString('es-BO'),
                time: date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
            }
        }
    }

    const parts = String(order.fecha || '').split(' ')
    return {
        date: parts[2] || order.fecha || '',
        time: [parts[0], parts[1]].filter(Boolean).join(' ')
    }
}

function ReceptionReceiptDocument({ order }) {
    const subtotal = itemsSubtotal(order)
    const surcharge = lineSurchargeTotal(order)
    const velox = veloxTotal(order)
    const total = orderTotal(order)
    const receivedAt = receptionDateParts(order)

    return <Document>
        {[0, 1].map(copy => <Page key={copy} size={ticketSize(order, copy === 0)} style={styles.page}>
            <Image alt="Lava Velox" src="/logo.png" style={styles.logo} />
            <Text style={styles.title}>ORDEN DE TRABAJO {order.sucursal || ''}</Text>
            {order.direccionSucursal && <Text style={styles.branch}>{order.direccionSucursal}</Text>}
            <Text style={styles.code}>{codeNumber(order.code)}</Text>
            <Text style={styles.center}>CONTACTOS 61278192 - 79588684</Text>
            <Text style={styles.center}>LA PAZ - BOLIVIA</Text>

            <View style={styles.section}>
                <View style={styles.line}><Text style={styles.key}>Fecha recepción:</Text><Text style={styles.value}>{receivedAt.date}</Text></View>
                <View style={styles.line}><Text style={styles.key}>Hora recepción:</Text><Text style={styles.value}>{receivedAt.time}</Text></View>
                <View style={styles.line}><Text style={styles.key}>Cliente:</Text><Text style={styles.value}>{order.nombre || ''}</Text></View>
                <View style={styles.line}><Text style={styles.key}>Celular:</Text><Text style={styles.value}>{order.whatsapp || ''}</Text></View>
                <View style={styles.line}><Text style={styles.key}>CI:</Text><Text style={styles.value}>{order.CI || ''}</Text></View>
            </View>

            <View style={styles.section}>
                <View style={styles.tableHeader}>
                    <Text style={styles.qty}>CANT.</Text>
                    <Text style={styles.detail}>DETALLE Y OBSERVACIONES</Text>
                    <Text style={styles.price}>SUBTOTAL</Text>
                </View>
                {values(order.servicios).map((item, index) => <View key={`${item.uuid || item['nombre 1']}-${index}`} style={styles.row}>
                    <Text style={styles.qty}>{item.cantidad}</Text>
                    <Text style={styles.detail}>{item['nombre 1'] || item.nombre || ''}{item.observacion ? ` · Obs: ${item.observacion}` : ''}</Text>
                    <Text style={styles.price}>{itemSubtotal(item)} Bs</Text>
                </View>)}
            </View>

            <View style={styles.section}>
                <View style={styles.totalRow}><Text style={styles.totalKey}>SUBTOTAL</Text><Text style={styles.totalValue}>{subtotal} Bs</Text></View>
                {surcharge > 0 && <View style={styles.totalRow}><Text style={styles.totalKey}>ADICIONAL</Text><Text style={styles.totalValue}>{surcharge} Bs</Text></View>}
                {velox > 0 && <View style={styles.totalRow}><Text style={styles.totalKey}>{order.veloxType === 'same_day' ? 'VELOX DEL DÍA' : 'VELOX POSTERIOR'}</Text><Text style={styles.totalValue}>{velox} Bs</Text></View>}
                {toNumber(order.descuento) > 0 && <View style={styles.totalRow}><Text style={styles.totalKey}>DESCUENTO</Text><Text style={styles.totalValue}>-{order.descuento} Bs</Text></View>}
                <View style={styles.totalRow}><Text style={styles.totalKey}>TOTAL</Text><Text style={styles.totalValue}>{total} Bs</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalKey}>A CUENTA</Text><Text style={styles.totalValue}>{order.ac || 0} Bs</Text></View>
                <View style={styles.totalRow}><Text style={styles.balanceKey}>SALDO</Text><Text style={styles.balanceValue}>{order.saldo || 0} Bs</Text></View>
            </View>

            {order['fecha para recojo'] && <Text style={styles.pickup}>Fecha de entrega: {order['fecha para recojo']}</Text>}
            {order['hora para recojo'] && <Text style={styles.pickup}>Hora de entrega: {order['hora para recojo']}</Text>}
            {order.velox && <Text style={styles.pickup}>{order.veloxType === 'same_day' ? 'VELOX DEL DÍA' : 'VELOX PARA FECHA POSTERIOR'}</Text>}

            {copy === 0 && <>
                <Text style={styles.noteTitle}>NOTA IMPORTANTE</Text>
                <Text style={styles.note}>La presente orden de trabajo acredita el derecho de propiedad del cliente para el recojo de su prenda.</Text>
                <Text style={styles.note}>No nos responsabilizamos por objetos dejados en prendas ni por daños derivados de mala calidad de telas o confección.</Text>
                <Text style={styles.note}>En caso de no recoger la prenda dentro del plazo establecido, quedará a disposición de la empresa.</Text>
                <Text style={styles.note}>¡GRACIAS POR SU PREFERENCIA!</Text>
                <Text style={styles.note}>www.app.lavavelox.com</Text>
            </>}
        </Page>)}
    </Document>
}

export default function ReceptionReceiptPDF({ i, label = 'Imprimir Comprobante', buttonStyled = '', title }) {
    const [isClient, setIsClient] = useState(false)
    useEffect(() => setIsClient(true), [])

    if (!isClient) return null

    return <div className="min-w-full">
        <PDFDownloadLink document={<ReceptionReceiptDocument order={i} />} fileName={`Comprobante_recepcion_${i.code || i.uuid}.pdf`}>
            {() => <Button type="button" theme="PrimaryPrint" styled={buttonStyled} title={title}>{label}</Button>}
        </PDFDownloadLink>
    </div>
}
