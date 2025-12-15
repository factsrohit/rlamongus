
import { useLocation } from "../hooks/useLocation";

function LocationBox(){
    const { location, lastUpdate, refreshLocation } = useLocation( 5000 );

  return (
    <>
    <p>Location Should Auto Update, If It Doesn't, Try:</p>
    <button className="neon" onClick={refreshLocation}>Refresh Current Location</button>
    
    <div className="info-box">
      
            <p>{location}</p>
            <p>{lastUpdate}</p>
    </div>
    </>
  );
  
};

export default LocationBox;
