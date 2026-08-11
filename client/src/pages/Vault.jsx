import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import VaultGate from "./VaultGate";

const Vault = () => {
  const [vaultToken, setVaultToken] = useState(null);

  return (
    <div>
      <Navbar />
      
      {/* VaultGate — blur div ke BAHAR */}
      {!vaultToken && <VaultGate onVerified={(token) => setVaultToken(token)} />}

      {/* Page content — ye blur hoga */}
      <div className={!vaultToken ? "blur-sm pointer-events-none select-none" : ""}>
        see all pswd
        {/* passwords yahan aayenge */}
      </div>
    </div>
  );
};

export default Vault;