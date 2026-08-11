import React from 'react'
import Navbar from '../components/Navbar'
import VaultGate from "./VaultGate";


const Vault = () => {
  const [vaultToken, setVaultToken] = useState(null);

  return (
    <div>
      <Navbar />
      see all pswd
      <div className={vaultToken ? "" : "blur-sm pointer-events-none select-none"}>
        {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}
        {/* page content */}
      </div>
    </div>
  )
}

export default Vault
// view all passwords page 