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
    page: { padding: '5mm', fontFamily: 'Inter', fontSize: 6, color: '#111827' },
    logo: { marginHorizontal: 'auto', marginBottom: 5, height: 38, width: 96 },
    title: { textAlign: 'center', fontSize: 7, fontWeight: 'bold', marginBottom: 2 },
    code: { textAlign: 'center', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    center: { textAlign: 'center', fontSize: 5, marginBottom: 1 },
    section: { marginTop: 7 },
    line: { flexDirection: 'row', marginBottom: 2 },
    key: { width: 70, fontWeight: 'bold', fontStyle: 'italic' },
    value: { flex: 1 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 0.7, borderBottomColor: '#111827', paddingBottom: 2, marginBottom: 2, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.3, borderBottomColor: '#E5E7EB' },
    qty: { width: 28, textAlign: 'center' },
    detail: { flex: 1 },
    obs: { flex: 1 },
    price: { width: 46, textAlign: 'right' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
    totalKey: { width: 48, textAlign: 'right', fontWeight: 'bold' },
    totalValue: { width: 48, textAlign: 'right' },
    balanceKey: { width: 48, textAlign: 'right', fontWeight: 'bold', backgroundColor: '#FEF08A' },
    balanceValue: { width: 48, textAlign: 'right', backgroundColor: '#FEF08A' },
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
const deliveryNotes = [
    'La presente orden acredita el derecho de propiedad del cliente para la entrega de su prenda.',
    'No nos responsabilizamos por objetos dejados en prendas ni por daños derivados de mala calidad de telas o confección.',
    'El cliente tiene 30 días posteriores a la fecha acordada para recoger su prenda.',
    '¡GRACIAS POR SU PREFERENCIA!'
]

const ticketSize = (order, includeNotes) => {
    const detailWidth = 53
    const observationWidth = 53
    const contentWidth = 199
    const fixedHeader = 78
    const customerRows = [order['fecha entrega'], order['nombre receptor'], order['whatsapp receptor'], order['CI receptor']]
        .reduce((height, value) => height + Math.max(7.2, textBlockHeight(value, 129, 6)) + 2, 7)
    const itemRows = values(order.servicios).reduce((height, item) => {
        const detailHeight = textBlockHeight(item['nombre 1'] || item.nombre || '', detailWidth, 6)
        const observationHeight = textBlockHeight(item.observacion || '-', observationWidth, 6)
        return height + Math.max(7.2, detailHeight, observationHeight) + 4.3
    }, 0)
    const totalRows = 4 + (lineSurchargeTotal(order) > 0 ? 1 : 0) + (veloxTotal(order) > 0 ? 1 : 0) + (toNumber(order.descuento) > 0 ? 1 : 0)
    const notesHeight = includeNotes
        ? 16.2 + deliveryNotes.reduce((height, note) => height + 2 + textBlockHeight(note, contentWidth, 5), 0)
        : 0
    const contentHeight = fixedHeader + customerRows + 19 + itemRows + 7 + totalRows * 9.2 + notesHeight

    return createTicketSize(contentHeight, { minimumHeight: 260, safetyMargin: 14 })
}

function DeliveryReceiptDocument({ order }) {
    const subtotal = itemsSubtotal(order)
    const surcharge = lineSurchargeTotal(order)
    const velox = veloxTotal(order)
    const total = orderTotal(order)

    return <Document>
        {[0, 1].map(copy => <Page key={copy} size={ticketSize(order, copy === 0)} style={styles.page}>
            <Image alt="Lava Velox" src="/logo.png" style={styles.logo} />
            <Text style={styles.title}>COMPROBANTE DE ENTREGA {order.sucursal || ''}</Text>
            <Text style={styles.code}>{order.code}</Text>
            <Text style={styles.center}>CONTACTOS 61278192 - 79588684</Text>
            <Text style={styles.center}>LA PAZ - BOLIVIA</Text>

            <View style={styles.section}>
                <View style={styles.line}><Text style={styles.key}>Fecha de entrega:</Text><Text style={styles.value}>{order['fecha entrega'] || ''}</Text></View>
                <View style={styles.line}><Text style={styles.key}>Receptor:</Text><Text style={styles.value}>{order['nombre receptor'] || ''}</Text></View>
                <View style={styles.line}><Text style={styles.key}>Celular:</Text><Text style={styles.value}>{order['whatsapp receptor'] || ''}</Text></View>
                <View style={styles.line}><Text style={styles.key}>CI:</Text><Text style={styles.value}>{order['CI receptor'] || ''}</Text></View>
            </View>

            <View style={styles.section}>
                <View style={styles.tableHeader}>
                    <Text style={styles.qty}>CANT.</Text>
                    <Text style={styles.detail}>DETALLE</Text>
                    <Text style={styles.obs}>OBS.</Text>
                    <Text style={styles.price}>SUBTOTAL</Text>
                </View>
                {values(order.servicios).map((item, index) => <View key={`${item.uuid || item['nombre 1']}-${index}`} style={styles.row}>
                    <Text style={styles.qty}>{item.cantidad}</Text>
                    <Text style={styles.detail}>{item['nombre 1'] || item.nombre || ''}</Text>
                    <Text style={styles.obs}>{item.observacion || '-'}</Text>
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

            {copy === 0 && <>
                <Text style={styles.noteTitle}>NOTA IMPORTANTE</Text>
                <Text style={styles.note}>La presente orden acredita el derecho de propiedad del cliente para la entrega de su prenda.</Text>
                <Text style={styles.note}>No nos responsabilizamos por objetos dejados en prendas ni por daños derivados de mala calidad de telas o confección.</Text>
                <Text style={styles.note}>El cliente tiene 30 días posteriores a la fecha acordada para recoger su prenda.</Text>
                <Text style={styles.note}>¡GRACIAS POR SU PREFERENCIA!</Text>
            </>}
        </Page>)}
    </Document>
}

export default function DeliveryReceiptPDF({ i, label = 'Imprimir Comprobante', buttonStyled = '', title }) {
    const [isClient, setIsClient] = useState(false)
    useEffect(() => setIsClient(true), [])

    if (!isClient) return null

    return <div className="min-w-full">
        <PDFDownloadLink document={<DeliveryReceiptDocument order={i} />} fileName={`Comprobante_entrega_${i.code || i.uuid}.pdf`}>
            {() => <Button type="button" theme="PrimaryPrint" styled={buttonStyled} title={title}>{label}</Button>}
        </PDFDownloadLink>
    </div>
}
