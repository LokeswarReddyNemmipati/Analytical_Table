jQuery.sap.require("zvui.work.Configuration");
jQuery.sap.require("zvui.work.script.global-app");
jQuery.sap.require("sap.ui.comp.smartvariants.SmartVariantManagement");
jQuery.sap.require("sap.ui.comp.smartfilterbar.SmartFilterBar");
jQuery.sap.require("sap.ui.comp.smarttable.SmartTable");
jQuery.sap.require("zvui.work.control.MultiInput");
jQuery.sap.require("zvui.work.control.AggregationPanel");
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"zvui/work/model/models",
	"sap/m/App",
	"sap/ui/model/json/JSONModel",
	"zvui/work/underscore-min",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/m/MessageBox"
], function (UIComponent, Device, models, App, JSONModel, underscoreJS, FlexibleColumnLayoutSemanticHelper, MessageBox) {
	"use strict";

	return UIComponent.extend("zvui.work.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {

			var oComponent = this;
			window.wrkspglobal = {};
			bcfg_fillVistexConfigVariables();
			initializeVariables();
			//odata metadata call
			//			if(document.location && document.location.search){

			//			var urlString = document.location.search;
			//			var arr = urlString.split("&WSTYP=");
			//			if(arr && arr[1]){
			//			var workspaceType = arr[1];  
			//			window.workspaceType = workspaceType;
			//			var workspaceType = arr[1].split("&")[0];
			//			workspaceType = decodeURIComponent(workspaceType);
			//			window.maintainGroup = workspaceType;
			//			}
			oComponent.clearWindowVariables();
			var bundle = oComponent.getModel("i18n").getResourceBundle();
			var workspaceType, layoutId, workspaceView, docNumber, documentField, apprefreshed = false, fromWorklist;
			var componentData = this.getComponentData();
			if (componentData != undefined && componentData.startupParameters) {
				if (componentData.startupParameters.WSTYP) {
					for (var key in componentData.startupParameters) {
						if (key == 'LYTID') {
							layoutId = componentData.startupParameters[key][0];
							fromWorklist = true;
						} else if (key == 'WSTYP') {
							workspaceType = componentData.startupParameters[key][0];
						} else {
							documentField = key;
							docNumber = componentData.startupParameters[key][0];
						}
					}
					sessionStorage.semanticObjectParams = window.location.hash.split("&/")[1];
				} else if (sessionStorage.semanticObjectParams) {
					//					var paramString;
					//					if(window.location.hash.indexOf("#SEMANTIC_OBJECT") !==  -1 &&
					//					   window.location.hash.indexOf("&/detail") === -1){
					//						sessionStorage.semanticObjectParams = window.location.hash.split("&/")[1];
					//						paramString = window.location.hash.split("&/")[1];
					//					}else if(sessionStorage.semanticObjectParams){
					//						paramString = sessionStorage.semanticObjectParams;
					apprefreshed = true;
					MessageBox.error(bundle.getText('APPREFRESHED'), {
						onClose: function (oAction) {
							history.go(-1);
						}
					});
					//					}
					//					if(paramString){
					////						a = '{"' + paramString.replace(/:/g,'","').replace(/-/g,'":"') + '"}'
					////						JSON.parse(a)
					//						
					//						var params = paramString.split("&");
					//						for(var i=0; i<params.length; i++){
					//							var key = params[i].split("=")[0], value = params[i].split("=")[1];
					//							
					//							if(key == 'LYTID'){
					//								layoutId = value;
					//							}else if(key == 'WSTYP'){
					//								workspaceType = value;
					//							}else{
					//								documentField = key;
					//								docNumber = value;
					//							}					
					//						}
					//					}
				} else if (location.hash.split("#SEMANTIC_OBJECT-XWRKSPACE")[1]) {
					var splitArr = location.hash.split("#SEMANTIC_OBJECT-XWRKSPACE")[1];
					var startupParameters = splitArr.split("&/")[1].split("&");
					for (var i = 0; i < startupParameters.length; i++) {
						var key = startupParameters[i].split("=")[0],
							value = startupParameters[i].split("=")[1];

						if (key == 'LYTID') {
							layoutId = value;
							fromWorklist = true;
						} else if (key == 'WSTYP') {
							workspaceType = value;
						} else {
							documentField = key;
							docNumber = value;
						}
					}
				}
			} else {
				if (jQuery.sap.getUriParameters().get("WSTYP")) {
					workspaceType = jQuery.sap.getUriParameters().get("WSTYP");
				} else if (jQuery.sap.getUriParameters().get("wstyp")) {
					workspaceType = jQuery.sap.getUriParameters().get("wstyp");
				}

				if (jQuery.sap.getUriParameters().get("LYTID")) {
					layoutId = jQuery.sap.getUriParameters().get("LYTID");
				} else if (jQuery.sap.getUriParameters().get("lytid")) {
					layoutId = jQuery.sap.getUriParameters().get("lytid");
				}
				if (jQuery.sap.getUriParameters().get("WSPVW")) {
					workspaceView = jQuery.sap.getUriParameters().get("WSPVW");
				} else if (jQuery.sap.getUriParameters().get("wspvw")) {
					workspaceView = jQuery.sap.getUriParameters().get("wspvw");
				}
				if (jQuery.sap.getUriParameters().get("GUID")) {
					docNumber = jQuery.sap.getUriParameters().get("GUID");
					documentField = "GUID";
				}
			}

			workspaceType = decodeURIComponent(workspaceType);
			window.maintainGroup = workspaceType;

			if (layoutId) {
				window.workspaceView = workspaceView;
				if (window.layoutId !== layoutId || window.workspaceType !== workspaceType) {
					vistexWorkspaceConfig.serverUrl = "";
				}
				window.workspaceType = workspaceType;
				window.layoutId = layoutId;
				window.docNumber = docNumber;
				window.documentField = documentField;
				window.detailPagePath = "WorkspaceView(wstyp='" + workspaceType + "',guid='" + window.docNumber + "')";
				window.prepareNavigationMessageStrip = true;
			} else {
				window.workspaceType = workspaceType;
				delete window.layoutId;
				vistexWorkspaceConfig.serverUrl = "";
			}

			if (!apprefreshed) {
				sap.ui.core.BusyIndicator.show(0);
			}
			this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");

			var oViewModel = new JSONModel({
				busy: true,
				modelChanged: false,
				delay: 0
			});

			this.setModel(oViewModel, "viewModel");

			oViewModel.setProperty("/insideWorkspaceApp", true);
			if (fromWorklist) {
				oViewModel.setProperty("/fromWorklist", true);
			} else {
				oViewModel.setProperty("/fromWorklist", false);
			}
			var oUIModel = new JSONModel({
				editable: false,
				enabled: true
			});
			this.setModel(oUIModel, "ui");
			if (layoutId || apprefreshed) {

			} else {
				var oDataService = '/WT/VUI/WS_' + workspaceType;
				var oServiceUrl = "";
				oServiceUrl = this.getServerUrl() + oDataService;

				var oModel = new sap.ui.model.odata.v2.ODataModel({
					serviceUrl: oServiceUrl,
					loadAnnotationsJoined: true
				});

				oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
				oModel.setDefaultCountMode(sap.ui.model.odata.CountMode.Inline);
				oModel.setRefreshAfterChange(false);

				oModel.read("/WorkspaceType(row_id='',wstyp='" + window.workspaceType + "')", {
					success: function (oData, response) {
						oComponent.getService("ShellUIService").then( // promise is returned
							function (oService) {
								oService.setTitle(oData.descr);
							},
							function (oError) {
								jQuery.sap.log.error("Cannot get ShellUIService", oError, "XXXXXXXXX.hr.MyTimesheet");
							}
						);
					}
				});
				oModel.read("/WorkspaceType(row_id='',wstyp='" + window.workspaceType + "')/to_WorkspaceView", {
					success: function (oData, response) {
						var oMetaModel = oModel.getMetaModel();
						oMetaModel.loaded().then(function () {
							oComponent.getRouter().initialize();
						});
					}
				});
				oModel.attachRequestSent(function (oEvent) {
					initializeVariables();
				});

				oComponent.setModel(oModel, "workspaceModel");
			}
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			window.underscoreJS = underscoreJS;
			if (layoutId) {
				oComponent.getRouter().initialize();
				this.getRouter().navTo("Detail", { path: window.detailPagePath }, true);
			}
		},
		getServerUrl: function () {
			var baseURL = vistexWorkspaceConfig.serverUrl,
				guiId;
			if (!baseURL) {
				if (wrkspglobal.server.url.icf.indexOf("bodc") == -1) {
					initializeVariables();
				}
				baseURL = wrkspglobal.server.url.icf;
				if (wrkspglobal.server.url.guiId == null || wrkspglobal.server.url.guiId == "") {
					guiId = Math.floor((Math.random() * 100) + 1) + '' + Math.floor((Math.random() * 100) + 1);
					wrkspglobal.server.url.guiId = guiId;
				} else {
					guiId = wrkspglobal.server.url.guiId;
				}
				guiId = 'sid(' + guiId + ')';
				if (baseURL.substring(baseURL.length - 1) != '/') {
					baseURL += '/';
				}
				baseURL += guiId;
				vistexWorkspaceConfig.serverUrl = baseURL;

			}
			return baseURL;
		},
		getHelper: function () {
			var oFCL = this.getRootControl().byId("idAppControl"),
				oParams = jQuery.sap.getUriParameters(),
				oSettings = {
					defaultTwoColumnLayoutType: sap.f.LayoutType.TwoColumnsMidExpanded,
					defaultThreeColumnLayoutType: sap.f.LayoutType.ThreeColumnsMidExpanded,
					mode: oParams.get("mode"),
					initialColumnsCount: oParams.get("initial"),
					maxColumnsCount: oParams.get("max")
				};

			return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
		},
		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (Device.support.touch && this._isMobile()) { // apply "compact" mode if touch is not supported
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				} else {
					//sapUiSizeCompact
					this._sContentDensityClass = "sapUiSizeCompact";
				}
			}
			return this._sContentDensityClass;
		},
		_isMobile: function () {
			var Uagent = navigator.userAgent || navigator.vendor || window.opera;
			return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(Uagent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(Uagent.substr(0, 4)));
		},
		exit: function () {
			var oComponent = this;
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/insideWorkspaceApp", false);
		},
		clearWindowVariables: function () {
			//			if(window.workspaceType){
			//				delete window.workspaceType;
			//			}

			//			if(window.maintainGroup){
			delete window.maintainGroup;
			//			}
			delete window.workspaceView;
			//			delete window.layoutId;
			delete window.docNumber;
			delete window.documentField;
			delete window.detailPagePath;
			delete window.prepareNavigationMessageStrip;
			delete window.fromWorklist;
			//			vistexWorkspaceConfig.serverUrl = "";
		}
	});
});