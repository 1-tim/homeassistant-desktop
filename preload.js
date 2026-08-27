'use strict';
// No privileged/Node APIs are exposed to the Home Assistant web content.
// contextIsolation is on and nodeIntegration is off; this file exists so the
// renderer runs in a locked-down context. Add contextBridge exposures here only
// if you deliberately want to grant the page a specific capability.
