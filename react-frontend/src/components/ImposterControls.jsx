import React, { useEffect } from "react";
import { useImposterActions } from "../hooks/useImposterActions";

function ImposterControls() {
    const { cooldown, remoteRemaining, backstabRemaining, impostersList, kill, killRemote, backstab, fetchImposters } = useImposterActions();

    // Fetch imposters on mount
    useEffect(() => {
        fetchImposters();
    }, [fetchImposters]);

    return (
        <div id="imposterstuff" className="container">
            <button className="kill" id="killBtn" onClick={kill} disabled={cooldown > 0}>💀 Kill</button>
            <p id="cooldown">{cooldown > 0 ? `Kill available in: ${cooldown}s` : ""}</p>

            <button className="kill" id="remoteKillBtn" onClick={killRemote} disabled={remoteRemaining > 0}>Snipe</button>
            <p id="remoteCooldown">{remoteRemaining > 0 ? `Remote kill available in: ${remoteRemaining}s` : ""}</p>

            <button className="kill" id="backstabKillBtn" onClick={backstab} disabled={backstabRemaining > 0}>BackStab</button>
            <p id="backstabCooldown">{backstabRemaining > 0 ? `Backstab available in: ${backstabRemaining}s` : ""}</p>

            <div id="impostersList" style={{ marginTop: 10, fontWeight: "bold" }}>
                Other Imposters: {impostersList}
            </div>
        </div>
    );
}

export default ImposterControls;