sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/m/Table",
	"sap/m/MessageBox",
	"sap/ui/core/Component"
	], function(Controller, History, ResponsiveTable, MessageBox, Component) {
	"use strict";

	return Controller.extend("zvui.work.controller.detailPage1", {

		model: new sap.ui.model.json.JSONModel(),
		messageButtonId : 'messageButton1',
		columnPosition: 'midColumn',

		onBeforeRendering: function() {
		},
		onAfterRendering: function() {
			var oController = this;
//			oController.getView().getContent()[0].getContent()[0]._getHeaderContent().fireEvent(sap.uxap.ObjectPageLayout.EVENTS.HEADER_VISUAL_INDICATOR_PRESS);
			if(oController.getView().getContent()[0].getContent()[0]._bHeaderExpanded){
				oController.getView().getContent()[0].getContent()[0]._handleDynamicTitlePress();
			}
			oController.getView().getContent()[0].getContent()[0].getFooter().onAfterRendering= function(oEvent){
				if(this.getVisible()){
					this.getParent()._$footerWrapper.removeClass("vistexHideFooterWrapper");
				}	
			}
			if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
				oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");
			}
		},
		onInit: function() {
//			var oController = this;
//			var viewModel = oController.getOwnerComponent().getModel("viewModel");
//			oController.getOwnerComponent().getModel("ui").setProperty("/msgVisible",false);			
		},

		onCollapse: function() {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			viewModel.setProperty("/layout", "TwoColumnsMidExpanded");
			viewModel.setProperty("/showDetailDetailClose",true);
			uiModel.setProperty("/showExpand", false);
			var sections = oController.getView().getContent()[0].getContent()[0].getSections();
			_.each(sections, function(section){
//				var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
				var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				oController.onClosingDscSideContent(dynamicSideContent);
			});
			var dynamicSideContent =  oController.getResponsiveSplitter(oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection.getSubSections()[0].getBlocks()[0].getContent()[0]);
			oController.onClosingDscSideContent(dynamicSideContent);
			this._updateUIElements();
		},
		onExpand: function() {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");			
			uiModel.setProperty("/showExpand", true);
			viewModel.setProperty("/layout", "MidColumnFullScreen");
			viewModel.setProperty("/showDetailDetailClose",true);
//			var sections = oController.getView().getContent()[0].getContent()[0].getSections();
//			_.each(sections, function(section){
////				var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
//				var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
//			oController.onClosingDscSideContent(dynamicSideContent);
//			});
////			var dynamicSideContent = oController.getView().getContent()[0]._oCurrentTabSection.getSubSections()[0].getBlocks()[0].getContent()[0];
//			var dynamicSideContent =  oController.getResponsiveSplitter(oController.getView().getContent()[0]._oCurrentTabSection.getSubSections()[0].getBlocks()[0].getContent()[0]);
//			oController.onClosingDscSideContent(dynamicSideContent);
			this._updateUIElements();
		},
		onhandleClose: function(oEvent){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var sPath = viewModel.getProperty("/navigationPath");
			var modelChanged = viewModel.getProperty("/modelChanged");
//			history.go(-1);
			viewModel.setProperty("/DetailPageSet",true);
			oController.removeTransientMessages();
			oController.removeMessages(oController);
			sap.ui.core.BusyIndicator.show(0);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var urlParameters = {};
			var functionImport = oMetaModel.getODataFunctionImport('DETAIL_CANCEL');
			if(functionImport && functionImport.parameter){
				var length = functionImport.parameter.length;
			}
			if(length > 0){
				var object = oController.getView().getBindingContext().getObject();
				for(var i=0; i < length; i++){
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}
			
			viewModel.setProperty(viewModel.getProperty("/DetailPageMainTablePath"),true);
			
//			var bundle=oController.getOwnerComponent().getModel("i18n").getResourceBundle();
//			if(modelChanged){
//				MessageBox.confirm(bundle.getText('CHANGESLOSTCONTINUE'), {
//					title: bundle.getText('CONFIRM'),                                  
//					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
//					onClose: function (oAction) {
//						if (oAction == 'YES'){
//							oController.onDiscard();
//							setTimeout(function(){
//							oController.onDetailCancelFI(urlParameters, sPath);
//							},10);
//						}else{
//							sap.ui.core.BusyIndicator.hide();
//						}
//					}
//				});
//			}else{
//				oController.onDetailCancelFI(urlParameters, sPath);
//			}
			oController.onDetailCancelFI(urlParameters, sPath);
			
		},
		
		onDetailCancelFI: function(urlParameters, sPath){
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
//			oModel.callFunction("/DETAIL_CANCEL", {
//				method: "POST",
//				urlParameters: urlParameters,
//				success : function(oData,response) {
//
//					viewModel.setProperty("/drilldown",false);
//					viewModel.setProperty("/hideDetailFooter",false);
//					viewModel.setProperty("/DetailDetailEntitySet","");
//					oController.removenoBackHash();
//					setTimeout(function(){
//						viewModel.setProperty("/onDetailDetailClose",true);
//						oController.getOwnerComponent().getRouter().navTo("Detail",{path:sPath},true);
//					}, 100);
//					if(viewModel.getProperty("/disableBulkEdit")){
//						viewModel.setProperty("/disableBulkEdit",false);
//					}
//					oController._updateUIElements();
//					oModel.refresh();
////					oController.removeMessages(oController);
//					sap.ui.core.BusyIndicator.hide();
//				},
//				error : function(oData,response){
//					sap.ui.core.BusyIndicator.hide();
//					setTimeout(function(){
//						oController.showMessagePopover(oController.messageButtonId);
//					}, 1000);
//				}
//			});
			
			viewModel.setProperty("/drilldown",false);
			viewModel.setProperty("/hideDetailFooter",false);
			viewModel.setProperty("/DetailDetailEntitySet","");
			oController.removenoBackHash();
			setTimeout(function(){
				viewModel.setProperty("/onDetailDetailClose",true);
//				oController.getOwnerComponent().getRouter().navTo("Detail",{path:sPath},true);
				history.go(-1);
			}, 100);
			if(viewModel.getProperty("/disableBulkEdit")){
				viewModel.setProperty("/disableBulkEdit",false);
			}
			oController._updateUIElements();
//			oModel.refresh();
//			oController.removeMessages(oController);
			sap.ui.core.BusyIndicator.hide();
			
		},

		onPreviousButton: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var currentPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var currentRowId = currentPath.split("row_id='");
			currentRowId = currentRowId[1].split("',")[0];
			var currentRowIdLenght = currentRowId.length;
			var Id = parseInt(currentRowId);
			if(Id > 1){
				Id--;
				var newRowId = Id.toString();
				while(newRowId.length < currentRowIdLenght){
					newRowId = 0 + newRowId;
				}
				var newPath = currentPath.replace(currentRowId,newRowId);
				oController.getView().bindElement(newPath);
			}

		},

		onNextButton: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var currentPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var currentRowId = currentPath.split("row_id='");
			currentRowId = currentRowId[1].split("',")[0];
			var currentRowIdLenght = currentRowId.length;
			var Id = parseInt(currentRowId);
			var rowCount = viewModel.getProperty("/DetailPageMaxRows");
			if(Id < rowCount){
				Id++;
				var newRowId = Id.toString();
				while(newRowId.length < currentRowIdLenght){
					newRowId = 0 + newRowId;
				}
				var newPath = currentPath.replace(currentRowId,newRowId);
				oController.getView().bindElement(newPath);
			}
		},

		onCallAction: function(oEvent){
			var oController = this;
			oController.removeTransientMessages();
			sap.ui.core.BusyIndicator.show(0);

			var oModel = oController.getView().getModel();
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{	
				var oMetaModel = oModel.getMetaModel();
				var oContext = oController.getView().getBindingContext();
				var object = oContext.getObject();

				var urlParameters = {};

				var oButton = oEvent.getSource();
				var functionName = oButton.data("Action");

				var functionImport = oMetaModel.getODataFunctionImport(functionName);
				var length = functionImport.parameter.length;

				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					urlParameters: urlParameters,
					success : function(oData,response) {
						oModel.read(oContext.getPath());
//						sap.ui.core.BusyIndicator.hide();
						var messageExists = oController.checkResponseForMessages(oData,response);
						if(messageExists){
							setTimeout(function(){
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error : function(oData,response){
						sap.ui.core.BusyIndicator.hide();
						setTimeout(function(){
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
		},
		onItemPress: function(oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			
			oController.onCloseTableDSC(oEvent);
			oController.onTableDrilldownNavigationClick(oEvent);
		},

		onListNavigate: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");

			oController.onCloseTableDSC(oEvent);
			oController.onTableDrilldownNavigationClick(oEvent);
		},

//		onItemPress: function(oEvent) {
//			var oController = this;
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var viewModel = this.getView().getModel("viewModel");
//			var oSource = oEvent.getSource();
//			var oSmartTable = oController.getSmartTableControl(oSource);
//			var sEntitySet = oSmartTable.getEntitySet();
//			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
////			var navigateAction = viewModel.getProperty("/navigateAction_" + sEntitySet);
////			var oUpdatable;
////			
////			if(oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"]){
////				oUpdatable = oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable.Bool;
////			}
////			
////			if(navigateAction !== "child" && (!oUpdatable || oUpdatable == "true")){
////			if(showingSideContent){
////				oController.onShowTableDSC(oEvent);
////			}else{
//				oController.onCloseTableDSC(oEvent);
//				oController.onPerformItemPress(oEvent);
////			}			
//		},
		onPerformItemPress: function(oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSelected = oEvent.getParameter("listItem");
			var oTable = oSelected.getParent();
			var oSource = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");

			var oSmartTable = oController.getSmartTableControl(oSource);

			var viewModel = oController.getView().getModel("viewModel");
			var sEntitySet = oEvent.getSource().getParent().getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");

			oController.removeTransientMessages();
			if(showingSideContent){
//				var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
				var dynamicSideContent = oController.getResponsiveSplitter(oSmartTable);
				var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
				var selectedPath = oSelected.getBindingContext().getPath();
				oSmartTable.getTable().removeSelections();
				oSmartTable.getTable().setSelectedItem(oSelected);
				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable);
			}else{

				var errorMessages = oController.checkErrorMessageExist(oModel);
				if(errorMessages){
					oController.showMessagePopover(oController.messageButtonId);
					return;
				}else{
					var oContext = oSelected.getBindingContext();
					oTable.removeSelections()
					oTable.setSelectedItem(oSelected);			
					oController.onDrillDown(sEntitySet,oContext,oSmartTable);
				}
			}
		},
		
		onCancel: function(oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var modelChanged = viewModel.getProperty("/modelChanged");

			if(modelChanged) {
				var DiscardButton = new sap.m.Button({
					text: "{i18n>DISCARD}",
					width: "120px",
					press: [oController.onDiscard,oController]
				});
				var DiscardChangesText = new sap.m.Text({
					text:"{i18n>DISCARDCHANGES}"
				});
				var cancelPopover = new sap.m.Popover({
					showHeader: false,
					contentWidth: "150px",
					contentHeight: "60px",
					content: [new sap.m.VBox({
						alignItems: "Center",		
						alignContent: "Center",
						items: [DiscardChangesText,DiscardButton]
					})
					],
					placement: "Top"
				});
				oController.getView().addDependent(cancelPopover);
				cancelPopover.openBy(oEvent.getSource());
			}else{
				oController.onDiscard();
			}
		},
		onDiscard: function(oEvent){
			var oController = this;
			sap.ui.core.BusyIndicator.show(0);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");

			var urlParameters = {};

			var functionImport = oMetaModel.getODataFunctionImport('CANCEL');
			if(functionImport && functionImport.parameter){
				var length = functionImport.parameter.length;
			}
			if(length > 0){
				var object = oController.getView().getBindingContext().getObject();
				for(var i=0; i < length; i++){
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}
//			var currentSectionId = oController.getView().getContent()[0].getSelectedSection();
//			var currentSection = oController.getView().byId(currentSectionId);
//			var dynamicSideContent = currentSection.getSubSections()[0].getBlocks()[0].getContent()[0];
			var content;
			var currentRoute = viewModel.getProperty("/currentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if(currentRoute == "Detail"){
				content = oController.getView();
			}else if(currentRoute == "DetailDetail"){
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			}
			while(!content.getSections){
				content = content.getContent()[0];
			}
			var sections = content.getSections();
			oModel.callFunction("/CANCEL", {
				method: "POST",
				urlParameters: urlParameters,
				success : function(oData,response) {
					var uiModel = oController.getView().getModel("ui");
					var viewModel = oController.getView().getModel("viewModel");
//					uiModel.setProperty("/editable",false);
					viewModel.setProperty("/modelChanged",false);
					if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
						oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
					}
					delete oController.correction_row_id;
					oController.removenoBackHash();
					_.each(sections, function(section){
						if(section.getSubSections()[0] && section.getSubSections()[0].getBlocks()[0] && 
								section.getSubSections()[0].getBlocks()[0]){							
//							var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
//							if(!dynamicSideContent.getMainContent){
//								dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[1];
//							}
							var dynamicSideContent;
							if(oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")){
								dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
							}else{
								dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
							}
							
							
							if(dynamicSideContent.getMainContent){
								oController.onClosingDscSideContent(dynamicSideContent);
								if(dynamicSideContent.getMainContent()[1]){
									var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
									dynamicSideContent.getMainContent()[1].data("optimized",false);
								}else{
									var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
									dynamicSideContent.getMainContent()[0].data("optimized",false);
								}								
								if(mainContentTable.getRows){
									mainContentTable.clearSelection();
								}else{
									mainContentTable.removeSelections();
								}		
								mainContentTable.getParent().invalidate();
								var sEntitySet = mainContentTable.getParent().getEntitySet();
								viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines",false);
//								if(!viewModel.getProperty("/fromSaveRefreshAction")){
//									oController.refreshSmartTable(mainContentTable.getParent());
//								}
							}
						}
					});
//					oController.onClosingDscSideContent(dynamicSideContent);
					if(viewModel.getProperty("/fromSaveRefreshAction")){
						oModel.invalidate();
						oController.getOwnerComponent().getModel().refresh();
						oModel.refresh();
						viewModel.setProperty("/fromSaveRefreshAction",false);
						viewModel.setProperty("/fromSaveBackActionRequired",false);
						setTimeout(function(){
							oController.optimizeSmartTable(mainContentTable.getParent());
						}, 1000);
					}else if(!viewModel.getProperty("/fromSaveBackActionRequired")){
						oModel.invalidate();
						oModel.refresh();
						viewModel.setProperty("/fromSaveBackActionRequired",false);
					}					
					if(viewModel.getProperty("/fromSaveDNCMessage")){
						viewModel.setProperty("/fromSaveDNCMessage",false);
					}else{
						oController.removeMessages(oController);
					}
					
					
//					history.go(-1);
//					sap.ui.core.BusyIndicator.hide();
				},
				error : function(oData,response){
					sap.ui.core.BusyIndicator.hide();
					setTimeout(function(){
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
				}
			});
		},
		
		onSave: function(oEvent){

			var oController = this;

			oController.removeTransientMessages();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var uiModel = oController.getView().getModel("ui");
			var viewModel = oController.getView().getModel("viewModel");
			var bundle=oController.getView().getModel("i18n").getResourceBundle();
			var urlParameters = {};
			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			var oSmartTable = dynamicSideContent.getMainContent()[0];

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{	
				var functionImportName = oEvent.getSource().data("FImport"); 
				var functionImport = oMetaModel.getODataFunctionImport(functionImportName);
				if(functionImport.parameter){
					var length = functionImport.parameter.length;
				}				
				if(length > 0){
					var object = oController.getView().getBindingContext().getObject();
					for(var i=0; i < length; i++){
						urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
					}
				}
				
				if(functionImport["vui.bodc.workspace.ActionProperties"] && 
				   functionImport["vui.bodc.workspace.ActionProperties"]["ConfirmationPopup"] &&
				   functionImportName != "SAVE" && functionImportName != "SAVE_AS_RUN" && 
				   functionImportName != "SAVE_N_CLOSE" &&
				   functionImportName != "SAV_RUN_N_REFR"){
					oModel.read("/Message_Data(action='" + functionImport.name + "')",{
						success : function(oData,response) {
							MessageBox.confirm(oData.message, {
								title: bundle.getText('CONFIRM'),                                  
								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
								onClose: function (oAction) {
									if (oAction == 'YES'){
										sap.ui.core.BusyIndicator.show(0);
										oModel.callFunction("/" + functionImportName, {
											method: "POST",
											urlParameters: urlParameters,
											success : function(oData,response) {
												var backAction = false;
												if(functionImport["vui.bodc.workspace.ActionProperties"] && 
												   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
												   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String == "Back"){
													if(functionImportName != "SAV_RUN_N_REFR"){
														backAction = true;
														viewModel.setProperty("/fromSaveBackActionRequired",true);
													}else{
//														viewModel.setProperty("/fromSaveRefreshAction",true);
													}													
												}
//												var uiModel = oController.getView().getModel("ui");
//												var viewModel = oController.getView().getModel("viewModel");
												viewModel.setProperty("/modelChanged",false);
												if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
													oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
												}
												oController.removenoBackHash();
//												oModel.invalidate();
//												oModel.refresh(true);
//												sap.ui.core.BusyIndicator.hide();
												viewModel.setProperty("/fromSaveDNCMessage",true);
												if(backAction){
													oController.onDiscard();
													setTimeout(function(){
														oController.onBackToSearch();
													}, 3000);
//												}else if(functionImportName == "SAV_RUN_N_REFR"){
//													oController.onDiscard();
												}else{
													var messageExists = oController.checkResponseForMessages(oData,response);
													if(messageExists){
														setTimeout(function(){
															oController.showMessagePopover(oController.messageButtonId);
															oController.onDiscard();
														}, 1000);
													}else{
														oController.onDiscard();
													}
												}
											},
											error : function(oData,response){
												sap.ui.core.BusyIndicator.hide();
												setTimeout(function(){
													oController.showMessagePopover(oController.messageButtonId);
												}, 1000);
											}
										});
									}
								}
							});
						}
					});
				}else{				
					sap.ui.core.BusyIndicator.show(0);
					oModel.callFunction("/" + functionImportName, {
						method: "POST",
						urlParameters: urlParameters,
						success : function(oData,response) {
							var backAction = false;
							if(functionImport["vui.bodc.workspace.ActionProperties"] && 
							   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
							   functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String == "Back"){
								if(functionImportName != "SAV_RUN_N_REFR" && functionImportName != "SAVE_N_CLOSE"){
									backAction = true;
									viewModel.setProperty("/fromSaveBackActionRequired",true);
								}else if(functionImportName == "SAVE_N_CLOSE"){
									viewModel.setProperty("/fromSaveRefreshAction",true);
									viewModel.setProperty("/fromSaveBackActionRequired",true);
								}								
							}
							if(functionImportName == "SAV_RUN_N_REFR" || functionImportName == "SAVE_N_CLOSE"){
								viewModel.setProperty("/fromSaveRefreshAction",true);
							}
							viewModel.setProperty("/modelChanged",false);
							if(!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()){
								oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for hiding footerWrapper
							}
							oController.removenoBackHash();
							if(functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN"){
								viewModel.setProperty("/saveOnDetailDetailPerformed",true);
							}
							
							oController.onClosingDscSideContent(dynamicSideContent);
//							oModel.invalidate();
//							oModel.refresh();
//							sap.ui.core.BusyIndicator.hide();
							viewModel.setProperty("/fromSaveDNCMessage",true);
							if(backAction){
								oController.onDiscard();
								setTimeout(function(){
									oController.onBackToSearch();
								}, 3000);		
//							}else if(functionImportName == "SAV_RUN_N_REFR"){
//								oController.onDiscard();
//								oController.onhandleClose();
							}else if(functionImportName == "SAVE_N_CLOSE"){
								oController.onDiscard();
								setTimeout(function(){
//										oController.onBackToSearch();
									history.go(- 1);
								}, 3000);
							}else{
								var messageExists = oController.checkResponseForMessages(oData,response);
								if(messageExists){
									setTimeout(function(){
										oController.showMessagePopover(oController.messageButtonId);
										oController.onDiscard();
									}, 1000);
								}else{
									oController.onDiscard();
								}
							}
						},
						error : function(oData,response){
							sap.ui.core.BusyIndicator.hide();
							setTimeout(function(){
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					});
				}
			}
		},
		
		onSaveAsRun: function(oEvent){
			
		},

//		onListNavigate: function(oEvent){
//			var oController = this;
//			var oModel = oController.getView().getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var viewModel = this.getView().getModel("viewModel");
//			var oSource = oEvent.getSource();
//			var oSmartTable = oController.getSmartTableControl(oSource);
//			var sEntitySet = oSmartTable.getEntitySet();
//			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
////			var navigateAction = viewModel.getProperty("/navigateAction_" + sEntitySet);
////			var oUpdatable;
////			
////			if(oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"]){
////				oUpdatable = oMetaModel.getODataEntitySet(sEntitySet)["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable.Bool;
////			}
////			
////			if(navigateAction !== "child" && (!oUpdatable || oUpdatable == "true")){
////			if(showingSideContent){
////				oController.onShowTableDSC(oEvent);
////			}else{
//				oController.onCloseTableDSC(oEvent);
//				oController.onPerformListNavigate(oEvent);
////			}
//		},
		onPerformListNavigate: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oSource = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");

			var oSmartTable = oController.getSmartTableControl(oSource);

			var oSelected = oEvent.getParameter("row");
			var viewModel = oController.getView().getModel("viewModel");
			var sEntitySet = oEvent.getSource().getParent().getParent().getParent().getParent().getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");

			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(showingSideContent){
//				var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
				var dynamicSideContent = oController.getResponsiveSplitter(oSmartTable);
				var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
				var selectedPath = oSelected.getBindingContext().getPath();
				oSmartTable.getTable().clearSelection();
				oSmartTable.getTable().setSelectedIndex(oSelected.getIndex());
//				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable);
			}else{
				if(errorMessages){
					oController.showMessagePopover(oController.messageButtonId);
					return;
				}else{
					var oContext = oSelected.getBindingContext();
					oSelected.getParent().setSelectedIndex(oSelected.getIndex());
					oController.onDrillDown(sEntitySet,oContext,oSmartTable);
				}
			}
		},

//		onItemPress: function(oEvent) {
//			var oController = this;	
//			var oSelected = oEvent.getParameter("listItem");
//			var oSource = oEvent.getSource();
//			var oSmartTable = oController.getSmartTableControl(oSource);
//			var oSelectedContext = oSelected.getBindingContext();
//			if(oSelectedContext){
//				oController.showDetailPopup(oSelectedContext,oSmartTable);
//			}
//		},

		onTableDrilldownNavigationClick : function(oEvent){
			var oController = this;
			var oSource = oEvent.getSource();
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			var oSmartTable = oController.getSmartTableControl(oSource);
			var oTable = oSmartTable.getTable();
			
			var oSelected;
			viewModel.setProperty("/DetailPageSet",false);
			if(oEvent.getParameter("listItem")){
				oSelected = oEvent.getParameter("listItem");
//				viewModel.setProperty("/DetailDetailTitle",oEvent.getParameter("listItem").getCells()[0].getText());
			}else if(oEvent.getParameter("row")){
				oSelected = oEvent.getParameter("row");
			}else{
				oSelected = oSource.getParent();
//				viewModel.setProperty("/DetailDetailTitle",oEvent.getSource().getText());
			}
			
			var sEntitySet = oSmartTable.getEntitySet();
			var oContext = oSelected.getBindingContext();
	
			viewModel.setProperty("/" + sEntitySet +"showSideContent",false);
			
			viewModel.setProperty("/DetailPageMainTablePath","/" + sEntitySet +"showSideContent");
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			if(oEntityType["com.sap.vocabularies.UI.v1.Facets"] == undefined )
				return;
			
			oController.removeTransientMessages();
			
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{
//				if(oTable.setSelectedIndex) {
//					oTable.setSelectedIndex(oSelected.getIndex());
//				}else{
//					oTable.removeSelections()
//					oTable.setSelectedItem(oSelected);	
//				}
				if(oEntityType["vui.bodc.workspace.SummaryGroup"]){
					var oObject = oContext.getObject();
					var newPath = oObject.sectn + "_PRX(row_id='" + encodeURI(oObject.row_id) + "')"; 
					oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected,newPath);
					viewModel.setProperty("/fromSummaryGroup",true);
				}else{
					viewModel.setProperty("/fromSummaryGroup",false);
					oController.onDrillDown(sEntitySet,oContext,oSmartTable,oSelected);
				}
			}
		},
		onDrillDown : function(sEntitySet,oContext,oSmartTable,oSelected, summaryPath){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var sPath = oContext.getPath();
			var object = oContext.getObject();
			var modelChanged = viewModel.getProperty("/modelChanged");
			viewModel.setProperty("/sectionPopover",{open: false});
			oModel.invalidateEntry(sPath);	
			sPath = sPath.substr(1, sPath.length);

			var navigationPath = "";
			if(summaryPath){
				navigationPath = summaryPath;
			}else{
				navigationPath = sPath;
			}
			
			var oRouter = oController.getOwnerComponent().getRouter();
			var previousHash = oRouter.getHashChanger().getHash();
			var aHash = previousHash.split('/')
			if(aHash.length > 2){
				var sPreviousPath = aHash[2];
				if(sPreviousPath == navigationPath)
					return;
			}

			var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_EXPAND");
			var urlParameters = {};								
			urlParameters["_row_id"] = object.row_id;
			var dynamicSideContent = oController.getResponsiveSplitter(oSmartTable);
			var bundle=oController.getOwnerComponent().getModel("i18n").getResourceBundle();		
			oController.onDrillDownProceed(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected);

		},
		
		onDrillDownProceed: function(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected){
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oRouter = oController.getOwnerComponent().getRouter();
			var oTable = oSmartTable.getTable();

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				urlParameters: urlParameters,
				success : function(oData,response) {

					viewModel.setProperty("/nextUiState",1);
					var oModel = oContext.getModel();
					var rowCount = oSmartTable._getRowCount();
					viewModel.setProperty("/DetailPageMaxRows",rowCount);					
					viewModel.setProperty("/disableBulkEdit",true);
					oController.onClosingDscSideContent(dynamicSideContent);
					oController.removenoBackHash();
					setTimeout(function(){						
						viewModel.setProperty("/preventHashChange",true);
						var level = 0;
						if(viewModel.getProperty("/currentDetailPageLevel") !== undefined &&
								viewModel.getProperty("/currentRoute") !== "Detail"){
							level = viewModel.getProperty("/currentDetailPageLevel");
							level++;
						}else{
							viewModel.setProperty("/fromDetailDrilldown",true);
						}
						sap.ui.core.BusyIndicator.show(0);
						oRouter.navTo("DetailDetail", {
							path: viewModel.getProperty("/navigationPath"),
							path1 : navigationPath,
							level: level
						}, false);
					}, 100);
				},
				error : function(oData,response){
					setTimeout(function(){
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
				}					
			});		
		},
//		onShowDetailDetailPopup: function(oEvent){
//			var oController = this;
//			var oSmartTable = oController.getOwnerControl(oEvent.getSource());
//			if(!oController.isSmartTable(oSmartTable))
//				oSmartTable = oSmartTable.getParent();
//			var oSelectedContext = oEvent.getSource().getParent().getParent().getBindingContext();
//			if(oSelectedContext){
//				oController.showDetailPopup(oSelectedContext,oSmartTable);
//			}
//		},

		showDetailPopup : function(oSelectedContext,oSmartTable){
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			
			var sEntitySet = oSmartTable.getEntitySet();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			if(oEntityType["com.sap.vocabularies.UI.v1.Facets"] == undefined )
				return;
			
			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if(errorMessages){
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}else{

				sap.ui.core.BusyIndicator.show(0);
				var path = oSelectedContext.getPath();

				var controlId = oSmartTable.getId();

				var entitySet = oSmartTable.getEntitySet();
				var entityType = entitySet + "Type";

				var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));
				var oEntityTypeContext = oMetaModel.createBindingContext(oMetaModel.getODataEntityType(entityType, true));

				oModel.read(path,null,null,true,function(oData,repsonse){});

				oMetaModel.loaded().then(function() {
					Component.getOwnerComponentFor(oController.getView()).runAsOwner(function(){
						sap.ui.core.mvc.View.create({
							preprocessors: {
								xml: {
									bindingContexts: {
										meta: oEntitySetContext,
										entitySet: oEntitySetContext,
										entityType: oEntityTypeContext
									},
									models: {
										meta: oMetaModel,
										entitySet: oMetaModel,
										entityType: oMetaModel
									}
								}
							},
							type: sap.ui.core.mvc.ViewType.XML,
							viewName: "zvui.work.templates.dialogdetailPage"
						}).then(function (oDetailView) {
							oController.getView().setModel(oModel);
							oDetailView.bindElement(path);							
							var DetailDialog = new sap.m.Dialog({
								content : oDetailView,
								showHeader: false,
								beginButton: new sap.m.Button({
									text:"{i18n>APPLY}",
									type:"Emphasized",
									visible: "{ui>/editable}",
									press: function(oEvent){
										var oDialog = oEvent.getSource().getParent();
										oModel.submitChanges({
											batchGroupId: "changes",
											success: function(data,resonse){
												oModel.refresh();
												viewModel.setProperty("/skipFiledChange",false);
												oDialog.destroyContent();
												oDialog.close();
											},
											error: function(data,response){
												viewModel.setProperty("/skipFiledChange",false);
												oDialog.destroyContent();
												oDialog.close();	
											}
										})
									}
								}),
								endButton : new sap.m.Button({
									text:"{i18n>CLOSE}",
									press:function(oEvent){
										oEvent.getSource().getParent().destroyContent();
										viewModel.setProperty("/skipFiledChange",false);
										oEvent.getSource().getParent().close();
										oModel.resetChanges();
									}
								})
							});
							viewModel.setProperty("/skipFiledChange",true);
							jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), DetailDialog);
							oController.getView().addDependent(DetailDialog);
							DetailDialog.addCustomData( new sap.ui.core.CustomData({"key": "parentControlId","value": controlId}));
							DetailDialog.open();
							sap.ui.core.BusyIndicator.hide();
						});
					});
				});
			}
		},

		applyAndUp: function(oEvent){
			var oController = this;
			history.go(-1);
		}	
	});

});