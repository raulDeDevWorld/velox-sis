'use client'

// import { QrScanner } from '@yudiel/react-qr-scanner';
import { useUser } from '@/context'
import { ordersRepository } from '@/features'

const Component = () => {
  const { setPendienteDB, setWebScann, setFilter, setFilterQR} = useUser()

  const handlerQR = async (result) => {
    if (result) {
      ordersRepository.resolveQrPath(result, setPendienteDB)
      setFilterQR(result)
      setWebScann(false)
    }
  }

  return (
    <></>
    // <QrScanner
    //   // constraints={{
    //   //   facingMode: 'environment'
    //   // }}
    //   onDecode={(result) => handlerQR(result)}
    // />
  );
}
export default Component
