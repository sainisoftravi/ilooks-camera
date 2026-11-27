import logging
import urllib.parse
from typing import List, Dict, Optional
from wsdiscovery.discovery import WSDiscovery
from onvif import ONVIFCamera

logger = logging.getLogger("iLook-ONVIF")

class OnvifScanner:
    """Discovers IP cameras on local LAN using WS-Discovery and ONVIF."""

    @staticmethod
    def discover_devices(timeout: int = 5) -> List[Dict[str, str]]:
        """Perform WS-Discovery probe across local subnet."""
        devices = []
        logger.info(f"Broadcasting WS-Discovery probe (timeout={timeout}s)...")
        
        wsd = WSDiscovery()
        try:
            wsd.start()
            services = wsd.searchServices(types=["NetworkVideoTransmitter"], timeout=timeout)
            
            for service in services:
                for xaddr in service.getXAddrs():
                    parsed = urllib.parse.urlparse(xaddr)
                    ip = parsed.hostname
                    port = parsed.port or 80
                    devices.append({
                        "ip": ip,
                        "port": port,
                        "xaddr": xaddr,
                        "types": [str(t) for t in service.getTypes()],
                        "scopes": [str(s) for s in service.getScopes()]
                    })
        except Exception as e:
            logger.error(f"Error during WS-Discovery: {e}")
        finally:
            try:
                wsd.stop()
            except Exception:
                pass

        # Deduplicate by IP
        unique = {}
        for dev in devices:
            if dev["ip"] not in unique:
                unique[dev["ip"]] = dev
                
        logger.info(f"Discovered {len(unique)} ONVIF device(s) on LAN.")
        return list(unique.values())

    @staticmethod
    def get_rtsp_uri(ip: str, port: int, user: str, password: str) -> Optional[str]:
        """Fetch primary RTSP stream URI using ONVIF credentials."""
        try:
            cam = ONVIFCamera(ip, port, user, password)
            media_service = cam.create_media_service()
            profiles = media_service.GetProfiles()
            if not profiles:
                return None
            
            # Select first active video profile (Main Stream)
            token = profiles[0].token
            stream_setup = {
                'Stream': 'RTP-Unicast',
                'Transport': {'Protocol': 'RTSP'}
            }
            res = media_service.GetStreamUri({'StreamSetup': stream_setup, 'ProfileToken': token})
            return res.Uri
        except Exception as e:
            logger.warning(f"Could not retrieve ONVIF RTSP URI for {ip}: {e}")
            return None
