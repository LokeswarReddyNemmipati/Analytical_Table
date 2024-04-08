sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/ui/core/Fragment",
	"sap/ui/core/mvc/View",
	"sap/ui/core/Component",
	"sap/ui/model/json/JSONModel"
], function (Controller, XMLTemplateProcessor, XMLPreprocessor, Fragment, View, Component, JSONModel) {
	"use strict";

	return Controller.extend("zvui.work.controller.Detail", {

		onInit: function () {
			var oController = this;

			oController.rootEntity = "WorkspaceView";
			oController.searchEntity = "WorkspaceView_SR";
			oController.servicePrefix = oController.getOwnerComponent().getServerUrl();
			//			if(sap.ui.getCore().byId("backBtn")){
			//				oController.fBackButton= sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction;
			//			}	
			var viewModel = this.getOwnerComponent().getModel("viewModel");
			viewModel.setProperty("/DetailPageSet", true);
			viewModel.setProperty("/visualFilterInitialized", "0");
			viewModel.setProperty("/filterBarInitialized", false);
			this.getOwnerComponent().getRouter().getRoute("Detail").attachPatternMatched(this._onObjectMatched, this);
			//			this.getOwnerComponent().getRouter().getRoute("DetailDetail").attachPatternMatched(this._onObjectMatched, this);
		},

		onExit: function () {
			var oController = this;
			//			if(sap.ui.getCore().byId("backBtn"))
			//				sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = oController.fBackButton;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var urlParameters = {};

			if (viewModel.getProperty("/cancelNotRequiredonExit")) {
				viewModel.setProperty("/cancelNotRequiredonExit", false);
			} else {
				urlParameters["infocus_clear"] = true;
				console.log("Detail Controller Exit triggered");
				oModel.callFunction("/CANCEL", {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
					},
					error: function (oData, response) {
					}
				});
				if (!window.launchpadHomeButtonClicked && oModel.sServiceUrl) {
					console.log("Detail Controller SAP Terminate triggered");
					//					setTimeout(function(){			
					var url = oModel.sServiceUrl.split("/WS/VUI")[0];
					url = url + '?sap-terminate=session';
					if ("sendBeacon" in navigator) {
						navigator.sendBeacon(url);
					} else {
						$.ajax({
							url: url,
							async: false
						});
					}
					//					},100);
				} else if (window.launchpadHomeButtonClicked) {
					window.launchpadHomeButtonCLicked = false;
				}
			}

			window.onhashchange = function () { };
			wrkspglobal.session.counterPause = true;

		},

		onAfterRendering: function () {
		},

		onBeforeRendering: function () {

		},

		onClickAssign: function (oEvent) {
			//			oEvent.getSource().getDependents()[0].openBy(oEvent.getSource());
		},
		onNavBack: function () {
			this.navBack();
		},

		navBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getOwnerComponent().getRouter().navTo("List", {}, true);
			}
		},


		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {

			var oController = this;
			var newodata = oEvent.getParameter("arguments").odata;
			var viewModel = oController.getView().getModel("viewModel");
			sap.ui.core.BusyIndicator.show(0);

			oController.sPath = oEvent.getParameter("arguments").path;
			var sPath = "/" + oController.sPath;
			viewModel.setProperty("/navigationPath", oController.sPath);
			var uiModel = oController.getOwnerComponent().getModel("ui");
			viewModel.setProperty("/saveOnDetailDetailPerformed", false);
			uiModel.setProperty("/editable", true);
			if (viewModel.getProperty("/fromSaveRefreshAction")) {
				oModel.refresh(true);
				viewModel.setProperty("/fromSaveRefreshAction", false);
			}
			var selectedPaths = {};
			if (sPath.startsWith("/")) {
				selectedPaths.entity = sPath.substring(1, sPath.indexOf("("));
			} else {
				selectedPaths.entity = sPath.split("(")[0];
			}
			selectedPaths.key = sPath.split("(")[1].substr(0, sPath.split("(")[1].length - 1);
			selectedPaths.path = sPath;
			//			selectedPaths.route = viewModel.getProperty("/NextRoute");

			// Changes for BreadCrumb when keys are different
			selectedPaths.titleValue = oController.getKeyValue(sPath);

			viewModel.setProperty("/selectedPaths", selectedPaths);

			if (!viewModel.getProperty("/skipPageRefresh")) {
				oController.createView();
			} else {
				viewModel.setProperty("/skipPageRefresh", false);
				sap.ui.core.BusyIndicator.hide();
			}

			var workspaceModel = oController.getOwnerComponent().getModel("workspaceModel");
			if (workspaceModel) {
				var oContext = workspaceModel.getContext("/" + oController.sPath);
				if (oContext && oContext.getObject()) {
					var descr = oContext.getObject().descr;
					viewModel.setProperty("/DetailTitle", descr);
				}
				var modelChanged = viewModel.getProperty("/modelChanged");
				var currentRoute = viewModel.getProperty("/currentRoute");
				if (modelChanged && currentRoute == "Detail" && viewModel.getProperty("/onDetailDetailClose")) {
					oController.noBackPlease();
					viewModel.setProperty("/onDetailDetailClose", false);
				} else if (viewModel.getProperty("/onDetailDetailClose")) {
					viewModel.setProperty("/onDetailDetailClose", false);
				}
			}
		},
		createView: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var workspaceModel = oController.getOwnerComponent().getModel("workspaceModel");
			var sPath = "/" + oController.sPath;
			var odata, wspvw;
			if (workspaceModel) {
				var list = _.pairs(workspaceModel.oData);
				var keys = oController.sPath.substring(oController.sPath.indexOf('(') + 1, oController.sPath.indexOf(')')).split(',');
				for (var i = 0; i < keys.length; i++) {
					var a = keys[i].split('=');
					if (a[0] == "wspvw") {
						wspvw = a[1];
						break;
					}
				}
				wspvw = wspvw.substr(1, wspvw.length - 2);
				viewModel.setProperty("/wspvw", wspvw);

				for (var i = 0; i < list.length; i++) {
					if (list[i][1].wspvw && list[i][1].wspvw == wspvw && list[i][1].odata != "") {
						odata = list[i][1].odata;
						break;
					}
				}
			} else {
				//			Static Change for detail Page navigation
				odata = "/VUI/WS_" + window.workspaceType + "_" + window.layoutId;
			}

			viewModel.setProperty("/wstyp", window.workspaceType);

			var entitySet = oController.rootEntity;
			viewModel.setProperty("/filterEntity", oController.searchEntity);

			var serviceURL;
			serviceURL = oController.servicePrefix + "/WS" + odata;

			var oModel = oController.getOwnerComponent().getModel();
			var modelChanged = viewModel.getProperty("/modelChanged");
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (modelChanged && currentRoute == "Detail" && viewModel.getProperty("/onDetailDetailClose")) {
				oController.noBackPlease();
				viewModel.setProperty("/onDetailDetailClose", false);
			} else if (viewModel.getProperty("/onDetailDetailClose")) {
				viewModel.setProperty("/onDetailDetailClose", false);
			}
			//			var sCalculatedCacheKey;
			//			if(window.detailPageTemplate && window.detailPageTemplate.serviceURL == serviceURL){
			//				sCalculatedCacheKey = window.detailPageTemplate.sCacheKey;
			//			}else{
			//				window.detailPageTemplate = {};
			//				window.detailPageTemplate.serviceURL = serviceURL;
			//				window.detailPageTemplate.sCacheKey = "detailView" + Date.now();
			//			}
			//			sCalculatedCacheKey = window.detailPageTemplate.sCacheKey;

			if (!oModel || viewModel.getProperty("/fromCardNavigation")) {
				viewModel.setProperty("/pageDestroyFromCreateView", true);
				viewModel.setProperty("/fromCardNavigation", false);
				oController.getView().getContent()[0].destroyContent();
				var metadataUrlParams = {};
				if (wspvw) {
					metadataUrlParams["WSPVW"] = wspvw;
				}
				if (oModel && oModel.sServiceUrl == serviceURL) {
					oController.metadataCount++;
					metadataUrlParams["COUNT"] = oController.metadataCount;
				} else {
					oController.metadataCount = 0;
				}
				if (!viewModel.getProperty("/fromWorklist")) {
					vistexWorkspaceConfig.serverUrl = "";
				}
				oController.servicePrefix = oController.getOwnerComponent().getServerUrl();
				var serviceURL = oController.servicePrefix + "/WS" + odata;
				oModel = new sap.ui.model.odata.v2.ODataModel({
					serviceUrl: serviceURL,
					metadataUrlParams: metadataUrlParams,
					loadAnnotationsJoined: true, preliminaryContext: true
				});

				oModel.attachRequestSent(function (oEvent) {
					var url = oEvent.getParameter("url");
					var entity = url.split("?$")[0];
					var searchEvent = viewModel.getProperty("/searchEvent");
					var searchEntity = viewModel.getProperty("/searchedEntity");
					// if (entity == "X01") {
					// 	if (!oController.requestSent) {
					// 		var mParameters = oController.readQueryPrepare(entity);
					// 		if (url.indexOf("$top") > -1) {
					// 			var top = parseInt(url.split("$top")[1].split("&$")[0].substr(1));
					// 			mParameters["$top"] = top;
					// 		}
					// 		if (url.indexOf("$skip") > -1) {
					// 			var skip = parseInt(url.split("$skip")[1].split("&$")[0].substr(1));
					// 			mParameters["$skip"] = skip;
					// 		}
					// 		oModel.read("/X01", {
					// 			urlParameters: mParameters
					// 		});
					// 		oController.requestSent = true;
					// 	} else {
					// 		oController.requestSent = false;
					// 	}
					// }
					if (searchEvent) {
						if (entity.indexOf(searchEntity) != -1) {
							viewModel.setProperty("/requestSent", true);
						}
					}
					var skipBusyIndicator = viewModel.getProperty("/skipBusyIndicator");
					if (!skipBusyIndicator && !viewModel.getProperty("/fromSummaryGroup")) {
						var entityName;
						if (entity.split("/")[1] && entity.split("/")[1].split("to_")[1]) {
							entityName = entity.split("/")[1].split("to_")[1];
						} else {
							entityName = entity.split("(")[0];
						}
						var facetParentTable = oController.getFacetParentTable(entityName, true);
						if (!facetParentTable) {
							if (url.startsWith("F4") && url.indexOf("$orderby") == -1) {

							} else {
								sap.ui.core.BusyIndicator.show(0);
							}
						}
					} if (viewModel.getProperty("/fromSummaryGroup")) {
						sap.ui.core.BusyIndicator.show(0);
					}
				});
				oModel.attachRequestCompleted(function (oEvent) {
					var viewModel = oController.getView().getModel("viewModel");
					if (!viewModel) {
						return;
					}

					// if (!viewModel.getProperty("/skipHideBusyIndicatorOnBatchComplete")) {
					sap.ui.core.BusyIndicator.hide();
					// }

					var oModel = oController.getView().getModel();
					var oMetaModel = oModel.getMetaModel();
					var searchEvent = viewModel.getProperty("/searchEvent");
					var requestSent = viewModel.getProperty("/requestSent");
					var searchEntity = viewModel.getProperty("/searchedEntity");
					var url = oEvent.getParameter("url");
					if (url) {
						var entity = url.split("?$")[0];
						if (entity.indexOf("WorkspaceView_SR") != -1) {
							if (searchEvent && requestSent) {
								viewModel.setProperty("/searchEvent", false);
								viewModel.setProperty("/requestSent", false);

								oController.refreshTableEntitiesData();

								if (viewModel.getProperty("/visualFilterInitialized") == "0") {
									viewModel.setProperty("/visualFilterInitialized", "1");
									if (viewModel.getProperty("/filterBarInitialized")) {
										//										Changes for Page generation from backend
										var oFilterBar = oController.getView().getContent()[0].getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
										oController.initializeVisualFilter(oFilterBar);
									}
								} else if (viewModel.getProperty("/visualFilterInitialized") == "1") {
									viewModel.setProperty("/visualFilterInitialized", "2");
								}

								//								oModel.refresh(true);
							}
						}

						if (entity.indexOf(oController.rootEntity) != -1 && window.prepareNavigationMessageStrip) {
							if (oEvent.getParameter("response").responseText && oController.getView) {
								var view = oController.getView();
								var oResponseData = JSON.parse(oEvent.getParameter("response").responseText);
								if (oResponseData.d.uittl) {
									view.getContent()[0].getContent()[0].getContent()[0].getSections()[0].
										getSubSections()[0].getBlocks()[0].insertContent(new sap.m.MessageStrip({
											text: oResponseData.d.uittl, type: sap.ui.core.MessageType.Information, showIcon: true
										}));
									window.prepareNavigationMessageStrip = false;
								}
								if (oResponseData.d.ui_selct) {
									var oFilterData = JSON.parse(oResponseData.d.ui_selct);
									viewModel.setProperty("/navigationFilterData", oFilterData);
									var oFilterBar = view.getContent()[0].getContent()[0].getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
									//									setTimeout(function(){
									//										oController.setFilterBarInitialData(oFilterBar);
									//									},1000);
								}
								if (oResponseData.d.show_actn) {
									viewModel.setProperty("/navigationButtonsVisible", oResponseData.d.show_actn);
								}
								if (oResponseData.d.disp_only) {
									viewModel.setProperty("/disp_only", oResponseData.d.disp_only);
								}
								if (oResponseData.d.smrid) {
									viewModel.setProperty("/SummaryGroupSmrid", oResponseData.d.smrid);
								}
							}
						}
						if (url.split("$select=") && url.split("$select=")[1] && url.split("$select=")[1].split("&$orderby") && url.split("$select=")[1].split("&$orderby")[1]) {
							var check = true;
							for (var i = 0; i < url.split("$select=")[1].split("&$orderby")[0].split(",").length; i++) {
								if (url.split("$select=")[1].split("&$orderby")[1].indexOf(url.split("$select=")[1].split("&$orderby")[0].split(",")[i]) > -1) {
								} else {
									check = false;
									break;
								}
							}
							if(check)
							{
								var fields = [];
								fields.push("zaccnum", "zquant", "zprice")
								var urlParameters = {
									//					"$select" : select.toString()
									$select: fields,
									$orderby: decodeURI(url.split("$select=")[1].split("&$orderby=")[1].split("&$")[0]),
								};
								urlParameters["$skip"] = 0;
								urlParameters["$top"] = 100;
								oModel.read("/X01", {
									urlParameters: urlParameters,
									success: function (oData, response) {
	
									},
								})
							}
							
						}
						if (oController.summaryGroupEntity && !oController.drilldownToSummary &&
							entity.indexOf(oController.summaryGroupEntity) != -1) {
							oController.drilldownToSummary = true;
							oController.drilldownToSummaryByRowid();
						}
						var correction_line_table_indices = viewModel.getProperty("/correction_line_table_indices");
						if (correction_line_table_indices) {
							var oTable = sap.ui.getCore().getElementById(correction_line_table_indices.tableId);
							var indices = correction_line_table_indices.indices;
							var selectionChange = true;
							setTimeout(function () {
								if (oTable._getScrollExtension().getVerticalScrollbar().scrollTop == 0 && viewModel.getProperty("/tablePosition") !== 0) {
									selectionChange = false;
									oTable._getScrollExtension().getVerticalScrollbar().scrollTop = viewModel.getProperty("/tablePosition");
								}
								if (selectionChange) {

									if (indices.length > 1) {
										for (var i = 0; i < indices.length; i++) {
											if (i == indices.length - 1) {
												viewModel.setProperty("/skipSlectionChange", false);
												viewModel.setProperty("/skipLockFunction", true);
											}
											oTable.addSelectionInterval(indices[i], indices[i]);
										}
									} else {
										viewModel.setProperty("/skipSlectionChange", false);
										viewModel.setProperty("/skipLockFunction", true);
										oTable.setSelectedIndex(indices[0]);
									}
									viewModel.setProperty("/correction_line_table_indices", undefined);

								}
							}, 200);
						}
					}
					wrkspglobal.session.ccounter = 7200;
					wrkspglobal.session.scounter = 7200;
					//					initializeVariables();
				});

				oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
				oModel.setDefaultCountMode(sap.ui.model.odata.CountMode.Inline);
				oModel.setRefreshAfterChange(false);

				oController.getView().setModel(oModel);
				oController.getOwnerComponent().setModel(oModel);
				oModel.attachPropertyChange(oController.fnPropertyChanged, oController);
				oModel.attachBatchRequestFailed(oController.onBatchRequestFailed, oController);
				oModel.attachBatchRequestCompleted(function (oEvent) {
					if (!viewModel.getProperty("/skipHideBusyIndicatorOnBatchComplete")) {
						sap.ui.core.BusyIndicator.hide();
					}
				});

				oModel.attachMessageChange(function (oEvent) {
					var aNewMessages = oEvent.getParameter("newMessages");
					var sTarget, aKeys, aKeyValue, value, additionalText = "";
					var oModel = oEvent.getSource();
					var oMetaModel = oModel.getMetaModel();
					for (var i = 0; i < aNewMessages.length; i++) {
						additionalText = "";
						sTarget = aNewMessages[i].getTarget();
						if (sTarget != "") {
							var entitySet = sTarget.substring(sTarget.indexOf('/') + 1, sTarget.indexOf('('));

							var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
							var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

							sTarget = sTarget.substring(sTarget.indexOf('(') + 1, sTarget.indexOf(')'));
							aKeys = sTarget.split(',');

							for (var j = 0; j < aKeys.length; j++) {
								aKeyValue = aKeys[j].split('=');
								if (aKeyValue[0] != 'row_id') {
									value = aKeyValue[1];
									value = value.substring(value.indexOf("'") + 1, value.lastIndexOf("'"));
									var oField = _.findWhere(oEntityType.property, { name: aKeyValue[0] });
									if (oField['sap:display-format'] == "NonNegative") {
										value = value.replace(/^0+/, '');
									}
									if (value != "") {
										if (additionalText != "")
											additionalText = additionalText + "/";
										additionalText = additionalText + value;
									}
								}
							}
							aNewMessages[i].setAdditionalText(additionalText);
						}
					}
				});

				var oMetaModel = oModel.getMetaModel();
				var entityType = entitySet + "Type";

				var hierarchyModel = new JSONModel();
				var hierarchy = [];
				hierarchyModel.setProperty("/nodes", hierarchy);

				oMetaModel.loaded().then(function () {
					//					var oModel = oController.getOwnerComponent().getModel();
					//					var oMetaModel = oModel.getMetaModel();
					var oRootEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(entitySet).entityType);
					if (oRootEntityType["vui.bodc.workspace.DateFormat"]) {
						window.dateFormat = oRootEntityType["vui.bodc.workspace.DateFormat"].String;
					}
					if (oRootEntityType["vui.bodc.workspace.DecimalNotation"]) {
						window.decimalNotation = oRootEntityType["vui.bodc.workspace.DecimalNotation"].String;
					}
					var VFModel = new JSONModel();
					var VFData = [];
					VFModel.setProperty("/VFData", []);
					oController.getView().setModel(VFModel, "VFModel");
					var filterEntitySet = oMetaModel.getODataEntitySet(oController.searchEntity);
					var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);

					if (viewModel.getProperty("/fromWorklist") &&
						oRootEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"] &&
						oRootEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"].length > 0) {
						hierarchyModel.setProperty("/showSnappingHeader", true);
						//						viewModel.setProperty("/" + filterEntitySet.name + "filterMode","snaphdr");
					} else {
						hierarchyModel.setProperty("/showSnappingHeader", false);
						//						viewModel.setProperty("/" + filterEntitySet.name + "filterMode","compact");						
					}
					viewModel.setProperty("/" + filterEntitySet.name + "filterMode", "compact");
					var actionCodes = [

						{
							key: "create_material",
							text: "Create Material"
						},
						{
							key: "create_material_xref",
							text: "Create Material XREF"
						},
						{
							key: "create_partner",
							text: "Create Partner"
						},
						{
							key: "bucket_update",
							text: "Bucket Update"
						}
					];
					viewModel.setProperty("/actionCodes", actionCodes);
					if (filterEntityType["vui.bodc.SummaryFieldCharacteristic"]) {
						//							_.each(filterEntityType["vui.bodc.SummaryFieldCharacteristic"],function(characteristic){
						//								var VFDataEntry = {};
						//								var data = characteristic.PropertyPath.split("/");
						//								var characteristicEntity = oMetaModel.getODataAssociationEnd(filterEntityType,data[0]);
						//								var characteristicEntityType = oMetaModel.getODataEntityType(characteristicEntity.type);
						//								var properties = characteristicEntityType.property;
						//								var cardTitle = _.find(properties,{name: data[1]})["sap:label"];
						//								VFDataEntry["visible"] = true;
						//								VFDataEntry["fetched"] = false;
						//								VFDataEntry["toolbarTitle"] = cardTitle;
						//								VFDataEntry["defaultChart"] = "BAR";
						//								VFDataEntry["count"] = "";
						//								VFDataEntry["sortOrder"] = "";
						//								VFDataEntry["characteristic"] = characteristic.PropertyPath.replace("/",".");
						//								VFDataEntry["chartContent"] = {
						//										"chartType": "None",
						//										"text": "Refine filter to set Value",
						//										"child": []
						//								}
						//								VFDataEntry["measureBy"] = {
						//										"selected": "",
						//										"data": []
						//								};
						//								_.each(filterEntityType["vui.bodc.SummaryFieldKeyfigure"],function(keyFigure){
						//									var keyFieldData = keyFigure.PropertyPath.split("/");
						//									var keyFieldEntity = oMetaModel.getODataAssociationEnd(filterEntityType,keyFieldData[0]);
						//									var keyFieldEntityType = oMetaModel.getODataEntityType(keyFieldEntity.type);
						//									var keyFieldProperties = keyFieldEntityType.property;
						//									var listLabel = _.find(keyFieldProperties,{name: keyFieldData[1]})["sap:label"];
						//									VFDataEntry["measureBy"]["data"].push({
						//										"text": listLabel,
						//										"key" : keyFigure["PropertyPath"]
						//									});
						//								});
						//								VFData.push(VFDataEntry);
						//							});									
						hierarchyModel.setProperty("/showVisualFilter", true);
					} else {
						hierarchyModel.setProperty("/showVisualFilter", false);
					}

					var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));
					var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(entityType, true));

					var oFilterEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oController.searchEntity, true));
					var oFilterEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oController.searchEntity).entityType);

					var oActualRootEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));

					var aFacets = oRootEntityType["com.sap.vocabularies.UI.v1.Facets"];

					if (window.layoutId && window.docNumber) {
						var oLabel = oRootEntityType["property"].find(function (prop) {
							return prop.name === "wstyp"
						})["com.sap.vocabularies.Common.v1.Label"].String;

						oController.getOwnerComponent().getService("ShellUIService").then( // promise is returned
							function (oService) {
								oService.setTitle(oLabel);
							},
							function (oError) {
								jQuery.sap.log.error("Cannot get ShellUIService", oError, "XXXXXXXXX.hr.MyTimesheet");
							}
						);
					}
					var oEntities = viewModel.getProperty("/entities");
					if (oEntities == null || oEntities == undefined) {
						oEntities = {};
					}
					var oEditable = {};
					for (var i = 0; i < aFacets.length; i++) {
						if (aFacets[i].Target && aFacets[i].Target.AnnotationPath
							&& aFacets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.LineItem") >= 0) {
							var sNavigationPath = aFacets[i].Target.AnnotationPath.split("/")[0];
							var oEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oRootEntityType, sNavigationPath).type);
							if (oEntities[oEntity.name] == undefined
								|| oEntities[oEntity.name] == null
								|| oEntities[oEntity.name] == "") {
								if (aFacets[i].TableType && aFacets[i].TableType.String == "Responsive") {
									oEntities[oEntity.name] = "ResponsiveTable";
								} else {
									oEntities[oEntity.name] = "NonResponsiveTable";
								}
								//								viewModel.setProperty("/navigateAction_" + oEntity.name, "details");

							}
							var oNavEntitySet = oMetaModel.getODataEntitySet(oMetaModel.getODataAssociationSetEnd(oRootEntityType, sNavigationPath).entitySet);
							oEditable[oNavEntitySet.name] = {};
						}
					}
					viewModel.setProperty("/entities", oEntities);
					hierarchyModel.setProperty("/entities", oEntities);
					hierarchyModel.setProperty("/ShowDetailDetail", false);
					hierarchyModel.setProperty("/varientID", "__SVM01");
					hierarchyModel.setProperty("/smartFilterId", "smartFilterBar");
					hierarchyModel.setProperty("/tableBindingPath", "to_WorkspaceView_SR");
					hierarchyModel.setProperty("/filterEntity", oController.searchEntity);

					viewModel.setProperty("/Editable", oEditable);

					var filterBarGroups = [];
					_.each(oFilterEntityType.navigationProperty, function (oNavProperty) {
						if (oNavProperty.name != "to_WorkspaceView") {
							var oNavEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oFilterEntityType, oNavProperty.name).type);
							var description = oNavEntity['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeNamePlural.String;
							filterBarGroups.push({
								key: oNavProperty.name,
								descr: description
							});
						}
					});
					hierarchyModel.setProperty("/filterBarGroups", filterBarGroups);

					//						var oDetailView = window.detailPageTemplate.oDetailView;
					//						if(window.layoutId && window.docNumber){
					//							var customParams = {
					//									lytid: window.layoutId
					//							};
					//							customParams[window.documentField] = window.docNumber;
					//							oDetailView.bindElement({
					//								path: sPath,
					//								parameters:{
					//									custom: customParams
					//								}
					//							});
					//						}else{
					//							oDetailView.bindElement(sPath);
					//						}							
					//						
					//						oController.getView().getContent()[0].addContent(oDetailView);
					//						oController.getView().getContent()[0].onAfterRendering = function(){
					//						}
					//					}else{
					if (oRootEntityType["vui.bodc.workspace.FlexiColumn"] && oRootEntityType["vui.bodc.workspace.FlexiColumn"].Bool &&
						oRootEntityType["vui.bodc.workspace.FlexiColumn"].Bool == "true") {
						viewModel.setProperty("/enableFlexColumn", true);
					} else {
						viewModel.setProperty("/enableFlexColumn", false);
					}
					var urlParameters = {};
					var X01Type = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet("X01").entityType);
					// X01Type.property[7]["extensions"].push({ name: 'label', value: 'Account Number', namespace: 'http://www.sap.com/Protocols/SAPData' });
					// X01Type["com.sap.vocabularies.UI.v1.LineItem"] = X01Type["vui.bodc.NonResponsiveLineItem"];
					// X01Type.property[5]["com.sap.vocabularies.Common.v1.SemanticObject"] = { String: "Object" };
					// X01Type.property[5]["sap:required-in-filter"] = "true";
					// X01Type.property[5]["extensions"].push({ name: "required-in-filter", value: "true", namespace: "http://www.sap.com/Protocols/SAPData" });
					// X01Type.property[22]["com.sap.vocabularies.Common.v1.SemanticObject"] = { String: "MaterialEntered" };
					// X01Type.property[22]["sap:required-in-filter"] = "true";
					// X01Type.property[22]["extensions"].push({ name: "required-in-filter", value: "true", namespace: "http://www.sap.com/Protocols/SAPData" });
					// X01Type["com.sap.vocabularies.UI.v1.LineItem"] = X01Type["vui.bodc.NonResponsiveLineItem"];
					// X01Type.property[17]["sap:aggregation-role"] = "measure"
					// X01Type.property[17]["com.sap.vocabularies.Analytics.v1.Measure"] = { Bool: "true" };
					// X01Type.property[17]["sap:required-in-filter"] = "true";
					// X01Type.property[17]["com.sap.vocabularies.Analytics.v1.Dimension"] = {};
					oModel.read("/Page(page_id='VW')", {
						urlParameters: urlParameters,
						success: function (oData) {
							if (!oData.vw_json) return;
							var viewstringData = oData.vw_json;
							viewstringData = viewstringData.replace(new RegExp("&", "g"), "&amp;");
							viewstringData = viewstringData.replace(new RegExp("&amp;amp;", "g"), "&amp;");
							var rawFile = new XMLHttpRequest();
							rawFile.open("GET", "myView.xml", false);
							rawFile.onreadystatechange = function () {
								if (rawFile.readyState === 4) {
									if (rawFile.status === 200 || rawFile.status == 0) {
										var allText = rawFile.responseText;
										viewstringData = allText;
										Component.getOwnerComponentFor(oController.getView()).runAsOwner(function () {
											sap.ui.core.mvc.View.create({
												definition: viewstringData,
												type: sap.ui.core.mvc.ViewType.XML,
												height: "100%"
											}).then(function (oDetailView) {

												if (window.layoutId && window.docNumber) {
													var customParams = {
														lytid: window.layoutId
													};
													customParams[window.documentField] = window.docNumber;
													oDetailView.bindElement({
														path: sPath,
														parameters: {
															custom: customParams
														}
													});
												} else {
													oDetailView.bindElement(sPath);
													// var context = new sap.ui.model.analytics.AnalyticalBinding(oModel, sPath, {}, [], [], {});
													// oDetailView.setBindingContext(context);
												}

												oController.getView().getContent()[0].addContent(oDetailView);
												oController.getView().getContent()[0].onAfterRendering = function () {
												}
												setTimeout(function () {
													var sControlId = oController.getView().getContent()[0].getContent()[0].getContent()[0].getContent()[0].getId();
													$("#" + sControlId + "-spacer").css({ "display": "none" });
													$("#" + sControlId).find(".sapUiLoSplitterBar").addClass("vistex-display-none");
												}, 500);
												oController.setNavigationTypeForTable(oDetailView);
											});
										});
									}
								}
							}
							rawFile.send(null);
						}

					});
					//					}					
				});
			} else {
				var oControl = oController.getView().getContent()[0].getContent()[0];
				if (oControl) {
					oControl.bindElement(sPath);
					oController.setNavigationTypeForTable(oControl);
					oController.clearTableSelections(oControl, false);
				}
				//				sap.ui.core.BusyIndicator.hide();
			}
		},

		onBacktoWorklist: function (oEvent) {
			var oController = this;
			this.getOwnerComponent().getRouter().navTo("Worklist", {}, true);
		},
		onDetailBackButton: function (oEvent) {

		},
	});

});