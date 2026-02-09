import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import styles from './SearchMap.module.css';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to update map center dynamically
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const SearchMap = ({ users, center = [51.505, -0.09] }) => {
    // Default center (London) if no users or user doesn't have location
    // Real implementation would need geocoding or lat/lng on users
    // For now we simulate random positions near center if no real coords

    return (
        <div className={styles.mapWrapper}>
            <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={center} />
                {users.map((user, idx) => {
                    // Only show users with valid coordinates
                    if (!user.location?.lat || !user.location?.lng) return null;

                    const position = [user.location.lat, user.location.lng];

                    return (
                        <Marker key={user.id || idx} position={position}>
                            <Popup>
                                <div className={styles.popupContent}>
                                    <div className={styles.popupHeader}>
                                        {user.photoURL && <img src={user.photoURL} alt="" className={styles.popupAvatar} />}
                                        <div className={styles.popupInfo}>
                                            <strong>{user.displayName}</strong>
                                            <div className={styles.popupMeta}>
                                                {user.category || 'User'}
                                            </div>
                                        </div>
                                    </div>
                                    <Link to={`/profile/${user.id}`} className={styles.popupLink}>
                                        View Profile
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default SearchMap;
