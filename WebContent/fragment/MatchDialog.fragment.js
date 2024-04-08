sap.ui.jsfragment("zvui.work.fragment.MatchDialog", {
	createContent: function(oController){
		var oFragment = this;
		var oController = this.getController();
		var viewModel = oController.getView().getModel("viewModel");
		var oModel = oController.getView().getModel();
		var oMetaModel = oModel.getMetaModel();
		
		if(!viewModel.getProperty("/matchDetails")){
			viewModel.setProperty("/matchDetails", {});
		}
		
		viewModel.setProperty("/matchDetails/matchTool",{});
		viewModel.setProperty("/matchDetails/fromMatchTool",true);
		viewModel.setProperty("/matchToolFullScreen",false);
		oContent = new sap.ui.layout.DynamicSideContent({
			sideContentFallDown: "BelowM",
			sideContentPosition: "Begin",
			containerQuery: true
		}).addStyleClass("sapUiDSCExplored noPadding");
		
		var oSourceTable = new sap.m.Table({
			headerToolbar: new sap.m.OverflowToolbar({
				content: [
					new sap.m.Title({
						text: "{i18n>SOURCEITEM}"
					})
				]
			}),
			columns: [
				new sap.m.Column({
					header: new sap.m.Text({
						text: "{i18n>FIELD}"
					}),
					visible: true
				}),
				new sap.m.Column({
					header: new sap.m.Text({
						text: "{i18n>VALUE}"
					}),
					visible: true
				})
			]
		});		
		var sourcePath, matchDialogSourceItemsDataPath ;
		if(viewModel.getProperty("/matchToolFromHeader")){
			var headerPath = viewModel.getProperty("/detailDetailHeaderPath");
//			oSourceTable.bindElement(headerPath);
			var headerEntity = headerPath.split("/")[headerPath.split("/").length - 1].split("(")[0];
			var oHeaderEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(headerEntity).entityType);
			sourcePath = headerPath;
			
			var lineItems;
			if(oHeaderEntityType["com.sap.vocabularies.UI.v1.Identification"]){
				lineItems = oHeaderEntityType["com.sap.vocabularies.UI.v1.Identification"];
			}else{
				if(oHeaderEntityType["vui.bodc.NonResponsiveLineItem"]){
					lineItems = oHeaderEntityType["vui.bodc.NonResponsiveLineItem"];
				}else{
					lineItems = oHeaderEntityType["vui.bodc.ResponsiveLineItem"];
				}
			}
			
			var tableData = [];
			_.each(lineItems,function(item){
				if(item.Value.Path !== "edtst"){
					var cellProperties =  _.find(oHeaderEntityType["property"],{name: item.Value.Path});
					var nonResponsiveLineItem;
					if(oHeaderEntityType["vui.bodc.NonResponsiveLineItem"]){
						nonResponsiveLineItem =  oHeaderEntityType["vui.bodc.NonResponsiveLineItem"].find(function(nrlitem){ return nrlitem.Value.Path == item.Value.Path});
					}
					if(!nonResponsiveLineItem || (nonResponsiveLineItem && !nonResponsiveLineItem["vui.bodc.MultiInput"])){
						if(cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String){
							tableData.push({"row1":cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name});
						}
					}
				}
			});
			viewModel.setProperty("/matchDialogSourceItemsData",tableData);

			var columnData =  [{"col":"row1","label":"Field"},{"col":"row2","label": "Value"}];
			viewModel.setProperty("/columnData",columnData);
			
			matchDialogSourceItemsDataPath = "viewModel>/matchDialogSourceItemsData";
			
			var matchEntities = [], oMatchPaths = [];
			var childEntity = viewModel.getProperty("/matchToolFromHeader").entity;
			var oChildEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(childEntity).entityType);
			if(oChildEntityType.navigationProperty && oChildEntityType.navigationProperty.length > 0){
				for(var i=0 ; i<oChildEntityType.navigationProperty.length; i++){
					var oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oChildEntityType,oChildEntityType.navigationProperty[i].name).type);
					if(oTargetEntity && oTargetEntity['vui.bodc.workspace.MatchHeader']){
						var matchEntityset = oMetaModel.getODataAssociationSetEnd(oChildEntityType,oChildEntityType.navigationProperty[i].name).entitySet;
						matchEntities.push(matchEntityset);
						
						var oMatchEntitySet = oMetaModel.getODataEntitySet(matchEntityset), oMatchEntityType;
						if(oMatchEntitySet && oMatchEntitySet.entityType){
							oMatchEntityType = oMetaModel.getODataEntityType(oMatchEntitySet.entityType);
						} 	
						if(oMatchEntityType && oMatchEntityType['com.sap.vocabularies.UI.v1.HeaderInfo']){
							oMatchPaths.push({
								name: matchEntityset,
								text: oMatchEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
								entityType: oMatchEntitySet.entityType,
							});
						}		
					}
				}
				if(oMatchPaths.length > 0){
					viewModel.setProperty("/matchDetails/matchPaths",oMatchPaths);
				}
				viewModel.setProperty("/matchEntities",matchEntities);
				var childTable = oController.getFacetParentTable(childEntity, true);
				if(childTable){
					var tableBindingInfo = oController.getTableBindingInfo(childTable);
					viewModel.setProperty("/mainTableBindingInfo",tableBindingInfo);
				}
			}
			
		}else{
			sourcePath = oController.DSCSourcePath;
			matchDialogSourceItemsDataPath = "viewModel>/itemsData" + oController.DSCID;
			oSourceTable.bindElement(oController.DSCSourcePath);			
		}
		
		var sourceEntity = sourcePath.split("/")[sourcePath.split("/").length - 1].split("(")[0];
		var oSourceEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sourceEntity).entityType);
		oSourceTable.bindAggregation("items",matchDialogSourceItemsDataPath,function(sId,oContext){
			var contextObject = oContext.getObject();
			var fcat_data = viewModel.getProperty("/columnData");
			var cells = [];
			_.each(fcat_data,function(obj){
				if(obj.col != "row1"){
					var oProperty = oSourceEntityType.property.find(function(obj){ return obj.name == contextObject.field});
					var sPath;
						if(oProperty["sap:unit"]){
	//						if(oDataField.NoOfDecimals){
	//						    return "{parts:[{path: '" + oDataField.Value.Path + "'},{value: '"+ oDataField.NoOfDecimals.String + "'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
	//						}else{
							sPath = "{parts:[{path: '" + contextObject.field + "'},{value: '2'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
	//						}
						}else if(oProperty && oProperty.type == "Edm.DateTime"){
							sPath = "{path:'" + contextObject.field + "', formatter:'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
						}else{
							if(contextObject.field) {
								var sTextArrangement;
								if(oProperty["com.sap.vocabularies.Common.v1.Text"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
									sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
											oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
									var sTextArrangementPath;
									switch (sTextArrangement) {
									case "idAndDescription":
										sTextArrangementPath = "{parts: [{path: '" + contextObject.field + "'} , {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
										break;
									case "idOnly":
										sPath = "{" + contextObject.field + "}";
										break;
									case "descriptionOnly":
										if(oProperty["com.sap.vocabularies.Common.v1.Text"]){
											sTextArrangementPath = "{" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "}";
										}else{
											sPath = "{" + contextObject.field + "}";
										}
										break;
									case "descriptionAndId":
										sTextArrangementPath = "{parts: [ {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'} , {path: '" + contextObject.field + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
										break;
									default:
										sPath = "{" + contextObject.field + "}";
									break;
									}
									sPath = sTextArrangementPath;
								}else{
									sPath = "{" + contextObject.field + "}";
								}
						}
					}
					var input = new sap.m.Text({text: sPath, wrapping: true});
					cells.push(input);
				}else{
					var text = new sap.m.Label({design: "Bold", wrapping: true}).bindProperty("text","viewModel" + ">" + obj["col"],null,sap.ui.model.BindingMode.OneWay);
					cells.push(text);
				}
			});
			return new sap.m.ColumnListItem({
				cells: cells,
				type: sap.m.ListType.Inactive,
			}).addStyleClass("noPadding");
		});
		oContent.addSideContent(new sap.m.VBox({ 
			items: [oSourceTable] 
		}).addStyleClass("matchToolSideContent"));
//		var oMatchPathSegmentedButton = new sap.m.SegmentedButton().addStyleClass("matchToolPath");
		var oMatchPathMenu = new sap.m.Menu();
		var oMatchPaths = viewModel.getProperty("/matchDetails/matchPaths");
		
		for(var i=0; i<oMatchPaths.length; i++){
//			oMatchPathSegmentedButton.addItem(new sap.m.SegmentedButtonItem({
//				text: oMatchPaths[i].text,
//				key: oMatchPaths[i].name,
//				press: oFragment.matchPathSelect.bind(oFragment)
//			}).data("matchPath",oMatchPaths[i]));
			
			oMatchPathMenu.addItem(new sap.m.MenuItem({
				text: oMatchPaths[i].text,
				press: oFragment.matchPathSelect.bind(oFragment)
			}).data({
				matchPath: oMatchPaths[i],
			}));	
		}				
		
//		if(oMatchPaths.length == 1){
//			oMatchPathSegmentedButton.setVisible(false);
//		}		
		
		var overflowToolbar = new sap.m.OverflowToolbar({
			content: [
//				oMatchPathSegmentedButton,
				new sap.m.Label({
					text:"{i18n>MATCHFOR}:"
				}),
				new sap.m.MenuButton({
					menu: oMatchPathMenu,
					type: sap.m.ButtonType.Transparent
				}),
				new sap.m.ToolbarSpacer(),
				new sap.m.Button({
					icon: "sap-icon://full-screen",
					press: oFragment.onDscSizeToggle.bind(oFragment)
				})
			]
		});
		
		var oMainContentPanel = new sap.m.Page({showHeader: false, enableScrolling: false});//.addStyleClass("matchToolMainContent")
		oMainContentPanel.addContent(overflowToolbar);
		oMainContentPanel.addContent(new sap.m.VBox());
		
//		var oIconTabBar = new sap.m.IconTabBar({
//			items: [
//				new sap.m.IconTabFilter({text:"{i18n>MANUALSEARCH}"}),
//				new sap.m.IconTabFilter({text:"{i18n>SUGGESTIONS}"})
////				new sap.m.IconTabFilter({text:"{i18n>COMPARE}"})
//			]
//		}).addStyleClass("matchIconTabBar");
				
//		oMainContentPanel.addContent(new sap.m.VBox({			
//			items:[
//				new sap.m.ScrollContainer({
//					height: "100%",
//					horizontal: false,
//					vertical: true,
//					content:[
//						new sap.m.Panel()
//					]
//				})
//			]
//		}));
		
		oContent.addMainContent(oMainContentPanel);
		
		oFragment.oDialog = new sap.m.Dialog({
			title : "{i18n>MATCHTOOLS}",
			draggable: true,
			contentWidth: "98%",
			contentHeight: "95%",
			horizontalScrolling: false,
			verticalScrolling: false,
			buttons: [
				new sap.m.Button({
					text: "{i18n>CLOSE}",
					press: function(oEvent){
						oFragment.oDialog.close();
						oFragment.oDialog.removeAllContent();
						viewModel.setProperty("/matchDetails/fromMatchTool",false);
						viewModel.setProperty("/matchToolFromHeader",undefined);
					}
				})
			]
		}).addStyleClass("sapUiSizeCompact");
		
		oFragment.oDialog.addContent(oContent);
		
//		oMatchPathSegmentedButton.getItems()[0].firePress();
		oMatchPathMenu.getItems()[0].firePress();
		return oFragment.oDialog;
	},
	matchPathSelect: function(oEvent){
		var oFragment = this;
		var oController = this.getController();
		var oSource = oEvent.getSource();
		var oMatchPathData = oSource.data().matchPath;
		var oModel = oController.getView().getModel();
		var oMetaModel = oModel.getMetaModel();
		var viewModel = oController.getView().getModel("viewModel");
		var previousHeaderEntity = viewModel.getProperty("/matchDetails/matchTool/headerEntity");
		var bundle = oController.getView().getModel("i18n").getResourceBundle();
		var oEntitySet, oEntityType, oTargetEntity, oTargetEntityName, oTabBarItemID;
		
		var oMenuButton = oSource.getParent().getParent();										
		oMenuButton.setText(oSource.getText());	
//		var oTabBarItems = oFragment.oDialog.getContent()[0].getMainContent()[1].getItems()[0].getItems();
		var oTabBarItems = oFragment.oDialog.getContent()[0].getMainContent()[0];
		if(previousHeaderEntity != oMatchPathData.entityType){
			viewModel.setProperty("/matchDetails/matchTool/headerEntity",oMatchPathData.entityType);
			viewModel.setProperty("/matchDetails/matchTool/headerEntityName",oMatchPathData.name);			
			
			oModel.read("/" + oMatchPathData.name,{
				success: function(oData,response){
					
					var hdrProp = {
							mpath: oData.results[0].mpath,
							thldp: parseInt(oData.results[0].thldp)
					};
					viewModel.setProperty("/matchDetails/matchTool/hdrProp",hdrProp);
					viewModel.setProperty("/matchDetails/matchTool/hdrDetails",oData.results[0]);												
					
					oEntityType = oMetaModel.getODataEntityType(oMatchPathData.entityType);
					if(oEntityType.navigationProperty && oEntityType.navigationProperty.length > 0){
						for(var i=0 ; i<oEntityType.navigationProperty.length; i++){
							oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType,oEntityType.navigationProperty[i].name).type);							
							if(oTargetEntity && oTargetEntity["vui.bodc.workspace.Match"]){									
								/*oTargetEntityName = oTargetEntity.name.split("Type")[0];
								viewModel.setProperty("/matchDetails/matchTool/manualFilterID", oTabBarItemID + "__" + Date.now() + "::manualFilter");
								var oMatchFragment = sap.ui.core.XMLTemplateProcessor.loadTemplate("zvui.work.fragment.MatchResult", "fragment");
								var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oTargetEntityName, true));
								var oEntityTypeContext = oMetaModel.createBindingContext(oTargetEntity.$path);																
								var oProcessedFragment = sap.ui.core.util.XMLPreprocessor.process(oMatchFragment, {
									caller: "XML-Fragment-templating"
								}, {
									bindingContexts: {
										meta: oMetaModel.createBindingContext("/"),
										entitySet: oEntitySetContext,
										entityType: oEntityTypeContext,
									},
									models: {
										meta: oMetaModel,
										entitySet: oMetaModel,
										entityType: oMetaModel,
										viewModel: viewModel
									}
								});
								
								oMatchFragment = sap.ui.xmlfragment({
									fragmentContent: oProcessedFragment
								}, oController);
								oMatchFragment.bindElement(oTargetEntity.$path);
								oTabBarItems[1].addContent(oMatchFragment);*/
							}else if(oTargetEntity && oTargetEntity["vui.bodc.workspace.ManualMatch"]){								
								oTargetEntityName = oTargetEntity.name.split("Type")[0];
								viewModel.setProperty("/matchDetails/matchTool/manualFilterID", oTabBarItemID + "__" + Date.now() + "::manualFilter");
								var oManualMatchFragment = sap.ui.core.XMLTemplateProcessor.loadTemplate("zvui.work.fragment.ManualMatch", "fragment");
								var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(oTargetEntityName, true));
								var oEntityTypeContext = oMetaModel.createBindingContext(oTargetEntity.$path);								
								var oProcessedFragment = sap.ui.core.util.XMLPreprocessor.process(oManualMatchFragment, {
									caller: "XML-Fragment-templating"
								}, {
									bindingContexts: {
										meta: oMetaModel.createBindingContext("/"),
										entitySet: oEntitySetContext,
										entityType: oEntityTypeContext,
									},
									models: {
										meta: oMetaModel,
										entitySet: oMetaModel,
										entityType: oMetaModel,
										viewModel: viewModel
									}
								});
								
								oManualMatchFragment = sap.ui.xmlfragment({
									fragmentContent: oProcessedFragment
								}, oController);
								if(oTabBarItems.getContent()[1]){
									oTabBarItems.removeContent(1);
								}
								oTabBarItems.addContent(oManualMatchFragment);
							}
						}
					}
				}
			});			
		}		
	},
	onDscSizeToggle: function(oEvent){
		var oFragment = this;
		var oController = this.getController();
		var viewModel = oController.getView().getModel("viewModel");
		var dynamicSideContent = oFragment.oDialog.getContent()[0];
		if(dynamicSideContent.getShowSideContent()){
			dynamicSideContent.setShowSideContent(false);
			oEvent.getSource().setIcon("sap-icon://exit-full-screen");
			viewModel.setProperty("/matchToolFullScreen",true);
		}else{
			dynamicSideContent.setShowSideContent(true);
			oEvent.getSource().setIcon("sap-icon://full-screen");
			viewModel.setProperty("/matchToolFullScreen",false);
		}
	}
});