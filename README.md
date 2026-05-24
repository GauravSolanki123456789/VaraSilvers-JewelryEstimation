
taskkill /F /IM node.exe 
command to kill ghost

command to access database 
psql "postgresql://postgres:GauravSolanki56789__g@localhost:5432/gauravsoftwares?sslmode=disable"

UPDATE products SET is_web_synced = false;

UPDATE products SET is_web_synced = false WHERE barcode = '100001';


UPDATE products 
SET is_web_synced = false 
WHERE barcode IN (
    'LAKSHMI-PCPHS00148', 
    'LAKSHMI-PCSHS00119', 
    'LAKSHMI-PCPHS00142', 
    'LAKSHMI-PCPHS00144', 
    'LAKSHMI-PCSHS00144', 
    'LAKSHMI-PCSHS00153', 
    'LAKSHMI-PCSHS00181', 
    'MEENAKSHI-PCPHS00123', 
    'PEACOCK-PCSHS00129', 
    'PEACOCK-PCSHS00199'
);


## ?? License

Proprietary - Gaurav Softwares

---

**Version:** 2.5.0 (Gold Master)  
**Last Updated:** January 2025
