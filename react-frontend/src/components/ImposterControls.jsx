import React, { useEffect } from "react";
import { useImposterActions } from "../hooks/useImposterActions";

function ImposterControls() {
    const { cooldown, remoteCooldown, backstabCooldown, impostersList, kill, killRemote, backstab, fetchImposters } = useImposterActions();

    // Fetch imposters on mount
    useEffect(() => {
        fetchImposters();
    }, [fetchImposters]);

    return (
        <div id="imposterstuff" className="container">
            <button className="kill" id="killBtn" onClick={kill}>💀 Kill</button>
            <p id="cooldown">{cooldown}</p>

            <button className="kill" id="remoteKillBtn" onClick={killRemote}>Snipe</button>
            <p id="remoteCooldown">{remoteCooldown}</p>

            <button className="kill" id="backstabKillBtn" onClick={backstab}>BackStab</button>
            <p id="backstabCooldown">{backstabCooldown}</p>

            <div id="impostersList" style={{ marginTop: 10, fontWeight: "bold" }}>
                Other Imposters: {impostersList}
            </div>
        </div>
    );
}

export default ImposterControls;