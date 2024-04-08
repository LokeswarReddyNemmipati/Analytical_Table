jQuery.sap.require("zvui.work.controller.AnnotationHelper");

sap.ui.define([
	"zvui/work/controller/BaseController"
	], function(Controller) {
	"use strict";

	return Controller.extend("zvui.work.controller.App", {

		onInit: function() {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.attachRouteMatched(this.onRouteMatched, this);
			this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
			
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			var oController = this;
			sap.ui.Device.resize.attachHandler(oController.onDeviceResize, oController); 

			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			oController._prepareSessionPopup();
		},
		
		onBeforeRouteMatched: function(oEvent) {
			sap.ui.core.BusyIndicator.show(0);
			var oModel = this.getOwnerComponent().getModel("viewModel");
			var uiModel = this.getOwnerComponent().getModel("ui");
			var oController = this;
			var sRouteName = oEvent.getParameter("name"),
			nextUiState;
			if(sRouteName == "Worklist"){
				oModel.setProperty("/showDetailClose",false);
				oModel.setProperty("/showDetailDetailClose",false);
				oModel.setProperty("/cuttentRoute","Worklist");
				nextUiState = 0;
			}else if(sRouteName == "Detail"){
				oModel.setProperty("/showDetailClose",true);
				oModel.setProperty("/showDetailDetailClose",false);
				oModel.setProperty("/cuttentRoute","Detail");
				uiModel.setProperty("/showExpand", true);
				nextUiState = 0;
				var flexibleColumnLayout = this.getOwnerComponent().getRootControl().byId("idAppControl");
				if(flexibleColumnLayout && flexibleColumnLayout.getCurrentBeginColumnPage() && flexibleColumnLayout.getCurrentBeginColumnPage().getContent() &&
						flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0] && 
						flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent &&
						flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent()[0] &&
						flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent &&
						flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0]){
					var objpageLayout = flexibleColumnLayout.getCurrentBeginColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0];
					setTimeout(function(){	
						if(objpageLayout._bHeaderExpanded){
							objpageLayout._handleDynamicTitlePress();
						}else{
							objpageLayout._handleDynamicTitlePress();
							objpageLayout._handleDynamicTitlePress();
						}
					});
				}
				if(oModel.getProperty("/selectedParentItemId")){
					$("#" + oModel.getProperty("/selectedParentItemId")).addClass("vistexSelectedItemColor");
					$("#" + oModel.getProperty("/selectedParentItemId") + "-sub").addClass("vistexSelectedItemColor");
				}
			}else if(sRouteName == "DetailDetail"){
				oModel.setProperty("/showDetailClose",false);
				oModel.setProperty("/showDetailDetailClose",true);
				oModel.setProperty("/cuttentRoute",sRouteName);
				nextUiState = 1;
				var flexibleColumnLayout = this.getOwnerComponent().getRootControl().byId("idAppControl");
				if(flexibleColumnLayout && flexibleColumnLayout.getCurrentMidColumnPage() && flexibleColumnLayout.getCurrentMidColumnPage().getContent() &&
						flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0] && 
						flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent &&
						flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent()[0] &&
						flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent &&
						flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0]){
					var objpageLayout = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0];
					setTimeout(function(){	
						if(objpageLayout._bHeaderExpanded){
							objpageLayout._handleDynamicTitlePress();
						}else{
							objpageLayout._handleDynamicTitlePress();
							objpageLayout._handleDynamicTitlePress();
						}
					});
				}
			}else if(sRouteName == "DetailDetail2"){
				oModel.setProperty("/showDetailClose",false);
				oModel.setProperty("/showDetailDetailClose",false);
				oModel.setProperty("/cuttentRoute",sRouteName);
				nextUiState = 0;
			}

			var sLayout; //= oEvent.getParameters().arguments.layout;

			// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
			if (!nextUiState) {
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(0);
				sLayout = oNextUIState.layout;
			}else{
				var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(nextUiState);
				sLayout = oNextUIState.layout;
			}

			// Update the layout of the FlexibleColumnLayout
			if (sLayout) {
				oModel.setProperty("/layout", sLayout);
				this._updateUIElements();
			}
		},

		onRouteMatched: function (oEvent) {
			var sRouteName = oEvent.getParameter("name"),
			oArguments = oEvent.getParameter("arguments");

			this._updateUIElements();

			// Save the current route name
			this.currentRouteName = sRouteName;
		},

		onStateChanged: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("viewModel");
			var appControl = this.getView().byId("idAppControl");
			if(oEvent.getParameter("layout") == "TwoColumnsBeginExpanded"){
//				oModel.setProperty("/showDetailClose", true);
				oModel.setProperty("/showDetailDetailClose", false);
			}else if(oEvent.getParameter("layout") == "TwoColumnsMidExpanded"){
//				oModel.setProperty("/showDetailClose", false);
				oModel.setProperty("/showDetailDetailClose", true);
				var flexibleColumnLayout = this.getOwnerComponent().getRootControl().byId("idAppControl");
				var objpageLayout = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0].getContent()[0].getContent()[0];
				setTimeout(function(){
					objpageLayout._handleDynamicTitlePress();
					objpageLayout._handleDynamicTitlePress();
				});	
			}
			this._updateUIElements();
		}
	});

});