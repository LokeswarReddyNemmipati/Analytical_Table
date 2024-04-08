initializeVariables();

function initializeVariables()
{
	wrkspglobal = {
		fromOtherApp: false,
		 session: {
	            maxTime: 7200,
	            ccounter: 7200,
	            scounter: 7200,
	            counterPause: false,
	            extensionPath: "",
	            notify: 15,
	            sessionend_skip: false,
	            fromFioriLaunchpad: false
	        },
			server: {
				url: {
					full: "",
					guiId: "",
					baseURL: "",
					object: "",
					icf: vistexWorkspaceConfig.hcpDestination ? vistexWorkspaceConfig.hcpDestination + "/sap/bc/bodc" : "/sap/bc/bodc"
				}

			}			
	}
	
}