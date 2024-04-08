(function () {
	"use strict";
	jQuery.sap.require("sap.ui.comp.smartfield.SmartField");
	//jQuery.sap.require("sap.suite.ui.generic.template.js.StableIdHelper");
	jQuery.sap.declare("zvui.work.controller.AnnotationHelper");

//	jQuery.sap.require("zvui.work.controller.detailPage");

	var Log = sap.ui.require("sap/base/Log");

	function fnExtensionLazyLoadEnabled(sExtensionPointId, oManifestExtend) {
		var oExtension = oManifestExtend[sExtensionPointId];
		var oExtensionGenericInfo = oExtension && oExtension["sap.ui.generic.app"];
		return !!(oExtensionGenericInfo && oExtensionGenericInfo.enableLazyLoading);
	}

	function getAllRestrictions(oContextSet, oProperty) {
		var bNotSortable = false;
		if (oContextSet["Org.OData.Capabilities.V1.SortRestrictions"] && oContextSet["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties) {
			var aNonSortableProperties = oContextSet["Org.OData.Capabilities.V1.SortRestrictions"].NonSortableProperties;
			for (var i = aNonSortableProperties.length - 1; i >= 0; i--) {
				if (aNonSortableProperties[i].PropertyPath === oProperty) {
					bNotSortable = true;
					break;
				}
			}
		}
		var bNotFilterable = false;
		if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"]) {
			if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].Filterable !== 'false') {
				if (oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties) {
					var aNonFilterableProperties = oContextSet["Org.OData.Capabilities.V1.FilterRestrictions"].NonFilterableProperties;
					for (var j = aNonFilterableProperties.length - 1; j >= 0; j--) {
						if (aNonFilterableProperties[j].PropertyPath === oProperty) {
							bNotFilterable = true;
							break;
						}
					}
				}
			} else {
				bNotFilterable = true;
			}
		}
		var oRestrictions = {
				getFilterRestriction : function() {
					return bNotFilterable;
				},
				getSortRestriction : function() {
					return bNotSortable;
				}
		};
		return oRestrictions ;
	}

	function hasSubObjectPage(oListEntitySet, aSubPages) {
		return !!(oListEntitySet.name && aSubPages && aSubPages.some(function(oSubPage){
			return oListEntitySet.name === oSubPage.entitySet;
		}));
	}

	function getBindingForIntent(sSemanticObject, sAction, sPath, bInEditAllowed, sPositive, sNegative){
		var sEditableCondition = bInEditAllowed ? "" : " && !${ui>/editable}";
		return "{= ${_templPriv>/generic/supportedIntents/" + sSemanticObject + "/" + sAction + "/" + sPath + "/supported}" + sEditableCondition + " ? " + sPositive + " : " + sNegative + "}";
	}

	function getSubObjectPageIntent(sListEntitySet, aSubPages, sAnnotationPath, sMode, hideChevronForUnauthorizedExtNav) {
		// if variable hideChevronForUnauthorizedExtNav is true, then sub object outbound target is returned only if hideChevronForUnauthorizedExtNav (manifest flag) is set to true for the corresponding table.
		var sNavigationProperty;
		if (sAnnotationPath){
			//AnnotationPath is only filled on Object Page which contains facets->annotationPath
			sNavigationProperty = sAnnotationPath.split("/")[0];
		}
		if (sListEntitySet && aSubPages) {
			for (var i = 0; i < aSubPages.length; i++) {
				if (sListEntitySet === aSubPages[i].entitySet && (!sNavigationProperty || sNavigationProperty === aSubPages[i].navigationProperty) && aSubPages[i].navigation && aSubPages[i].navigation[sMode]) {
					if (hideChevronForUnauthorizedExtNav) {
						if (aSubPages[i].component && aSubPages[i].component.settings && aSubPages[i].component.settings.hideChevronForUnauthorizedExtNav) {
							return aSubPages[i].navigation[sMode].target;
						}
					} else {
						return aSubPages[i].navigation[sMode].target;
					}
				}
			}
		}
		return null;
	}

	// Returns a binding string for navigation.
	// bForActionCount determines, whether this is for property rowActionCount (in the Grid/ Analytical table, values 0 or 1) or type of ColumnListItem (values Navigation and Inactive)
	// bInEditAllowed determines wether navigation is allowed in edit mode (this is not the case in non-draft object pages)
	// bTrueForSure can be used to overrule the normal logic and always allow navigation
	function getNavigationBinding(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bInEditAllowed, bForActionCount, bTrueForSure) {
		var sPositive = bForActionCount ? "1" : "Navigation";
		if (bTrueForSure){
			return sPositive;
		}
		var sNegative = bForActionCount ? "0" : "Inactive";
		var sApostrophe = bForActionCount ? "" : "'";
		// check if table has inline external navigation and hideChevronForUnauthorizedExtNav flag is set to true.
		var sOutboundTarget = getSubObjectPageIntent(oListEntitySet.name, aSubPages, sAnnotationPath, "display", true);
		if (sOutboundTarget) {
			var oCrossNavTarget = oManifest["sap.app"].crossNavigation.outbounds[sOutboundTarget];
			var sSemanticObject = oCrossNavTarget.semanticObject;
			var sAction = oCrossNavTarget.action;
			// sPath is the unique key corresponding to the table to bind chevron visibility for that table in templPrivModel.
			var sPath = oListEntitySet.name + (sAnnotationPath ? ("::" + sAnnotationPath.split("/")[0]) : "");
			return getBindingForIntent(sSemanticObject, sAction, sPath, bInEditAllowed, sApostrophe + sPositive + sApostrophe, sApostrophe + sNegative + sApostrophe);
		}
		if (hasSubObjectPage(oListEntitySet, aSubPages)) {
			return bInEditAllowed ? sPositive : "{= ${ui>/editable} ? " + sApostrophe + sNegative + sApostrophe + " : " + sApostrophe + sPositive + sApostrophe + " }";
		}
		return sNegative;
	}

	// Returns the expression binding/ value for the row action count in the Grid/ Analytical table for chevron display.
	function getRowActionCount(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bInEditAllowed) {
		return getNavigationBinding(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bInEditAllowed, true);
	}

	var oAnnotationHelper = {
			getBindingForHiddenPath: function (oHidden) {
				if (oHidden["com.sap.vocabularies.UI.v1.Hidden"]) {
					if (oHidden["com.sap.vocabularies.UI.v1.Hidden"].hasOwnProperty("Path")) {
						return "{= !${" + oHidden["com.sap.vocabularies.UI.v1.Hidden"].Path + "} }"; // <Annotation Term="UI.Hidden" Path="Edit_ac"/>
					} else if (oHidden["com.sap.vocabularies.UI.v1.Hidden"].hasOwnProperty("Bool")) {
						if (oHidden["com.sap.vocabularies.UI.v1.Hidden"].Bool === "true") {
							return false; // <Annotation Term="UI.Hidden" Bool="true"/>
						} else if (oHidden["com.sap.vocabularies.UI.v1.Hidden"].Bool === "false") {
							return true; // <Annotation Term="UI.Hidden" Bool="false"/>
						} else {
							Log.error(oHidden["com.sap.vocabularies.UI.v1.Hidden"].Bool + " is not a boolean value" );
							return true; // <Annotation Term="UI.Hidden" Bool="Value other than true or false"/>
						}
					} else {
						return false; // <Annotation Term="UI.Hidden"/>
					}
				} else {
					return  true;
				}
			},

			getCustomDataForContactPopup: function (oContactDetails) {
				return ((JSON.stringify(oContactDetails)).replace(/\}/g, "\\}").replace(/\{/g, "\\{")); //check bindingParser.escape
			},

			// render only those column which have data to be displayed
			// if only inline=false actions; then do not render column
			renderColumnForConnectedFields: function (aConnectedDataFields) {
				var checkForInlineActions = function (oDataField) {
					return  ((oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") && !(oDataField.Inline && oDataField.Inline.Bool === "true"));
				};
				if (aConnectedDataFields.length) {
					if (!aConnectedDataFields.every(checkForInlineActions)) {
						return "true";
					} else {
						return "false";
					}
				} else {
					return "false";
				}
			},

			getRequestFields : function(oEntityType,oDataField){
				var fields = "";
				if(oDataField.Value && oDataField.Value.Path){
					if(fields != ""){
						fields = fields + ",";
					}
					fields = fields + oDataField.Value.Path;

					if(oDataField.FieldControl && oDataField.FieldControl.String){
						if(fields != ""){
							fields = fields + ",";
						}
						fields = fields + oDataField.FieldControl.String;
					}

					var object = null;
					object = _.findWhere(oEntityType.property,{name : oDataField.Value.Path});
					if(object != null ) {

						if(object['sap:text']) {
							if(fields != ""){
								fields = fields + ",";
							}
							fields = fields + object['sap:text'];
						}

						if(object['sap:field-control']) {
							if(fields != ""){
								fields = fields + ",";
							}
							fields = fields + object['sap:field-control'];
						}

						if(object['sap:unit']) {
							if(fields != ""){
								fields = fields + ",";
							}
							fields = fields + object['sap:unit'];
						}


						if( object['sap:unit'] != undefined ) {
							var obj
							obj = _.findWhere(oEntityType.property,{name :object['sap:unit']});
							if(obj != null) {
								if (obj['sap:field-control'] != undefined) {
									if(fields != ""){
										fields = fields + ",";
									}
									fields = fields + obj['sap:field-control']; 
								}
								if(obj['sap:text']) {
									if(fields != ""){
										fields = fields + ",";
									}
									fields = fields + obj['sap:text'];
								}
							}

						}
					}
					
					if(oDataField.HREF && oDataField.HREF.Path){
						if(fields != ""){
							fields = fields + ",";
						}
						fields = fields + oDataField.HREF.Path;
					}
				}
				return fields;
			},


			getRequestAtLeastFields : function(oEntityType) {
				var fields = "";
				for(var i = 0;i < oEntityType.key.propertyRef.length;i++) {
					if(fields != ""){
						fields = fields + ",";
					}
					fields = fields + oEntityType.key.propertyRef[i].name;
				}
				var lineItems;
				if(oEntityType["vui.bodc.NonResponsiveLineItem"]){
					lineItems = oEntityType["vui.bodc.NonResponsiveLineItem"];
				}else{
					lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];
				}	
//				for(i = 0; i < lineItems.length ; i++ ){
//					if(lineItems[i].Fields){
//						for(var j=0;j<lineItems[i].Fields.length;j++){
//							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i].Fields[j]);
//							if(fieldTemp != ""){
//								if(fields != ""){
//									fields = fields + ",";
//								}
//								fields = fields + fieldTemp;
//							}	
//						}
//					}else{
//						var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i]);
//						if(fieldTemp != ""){
//							if(fields != ""){
//								fields = fields + ",";
//							}
//							fields = fields + fieldTemp;
//						}
//					}
//				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(i = 0; i < lineItems.length ; i++ ){
						if(lineItems[i].Fields){
							for(var j=0;j<lineItems[i].Fields.length;j++){
								var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i].Fields[j]);
								if(fieldTemp != ""){
									if(fields != ""){
										fields = fields + ",";
									}
									fields = fields + fieldTemp;
								}	
							}
						}else{
							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i]);
							if(fieldTemp != ""){
								if(fields != ""){
									fields = fields + ",";
								}
								fields = fields + fieldTemp;
							}
						}
					}
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(i = 0; i < lineItems.length ; i++ ){
						if(lineItems[i].Fields){
							for(var j=0;j<lineItems[i].Fields.length;j++){
								var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i].Fields[j]);
								if(fieldTemp != ""){
									if(fields != ""){
										fields = fields + ",";
									}
									fields = fields + fieldTemp;
								}	
							}
						}else{
							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType,lineItems[i]);
							if(fieldTemp != ""){
								if(fields != ""){
									fields = fields + ",";
								}
								fields = fields + fieldTemp;
							}
						}
					}
				}
				
				if(oEntityType["vui.bodc.workspace.Match"] || oEntityType["vui.bodc.workspace.ManualMatch"]){
					fieldTemp = "mqlfr";
					if(fields != ""){
						fields = fields + ",";
					}
					fields = fields + fieldTemp;
				}
				
				var aTechnicalFields = [
					"row_id",
					"rowst",
					"edtst",
					"hide_filter",
					"sectn",	// Required for Summary Group
					"updkz",
					"error"
					];

				for(i = 0; i < aTechnicalFields.length ; i++ ){
					var object = null;
					object = _.findWhere(oEntityType.property,{name : aTechnicalFields[i] });
					if(object != null) {
						if(fields != ""){
							fields = fields + ",";
						}
						fields = fields + aTechnicalFields[i];
					}
				}
				return fields;
			},

			renderColumnHeader: function (aConnectedDataFields) {
				var checkForInlineActions = function (oDataField) {
					return  (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation");
				};
				if (aConnectedDataFields.length) {
					if (aConnectedDataFields.every(checkForInlineActions)) {
						return "true";
					} else {
						return "false";
					}
				}
			},

			/*getObjectStatusText : function(oDataFieldValue){
				if(oDataFieldValue['sap:text']) {
					return "{" + oDataFieldValue['sap:text'] + "}";
				}else{
					return "{" + oDataFieldValue.name + "}";
				}
			},

			getObjectStatusState : function(oDataFieldValue){
				return "{parts: [{value: '" + oDataFieldValue.name + "'} , {path: '" + oDataFieldValue.name + "'} ], formatter: 'zvui.work.controller.AnnotationHelper.getObjectStatusStateValue'}";

			},

			getObjectStatusStateValue: function(sFieldName,sFieldValue){

				switch(sFieldName){
				case "hdsts" :
					switch(sFieldValue){
					case "1" : 
						return "Information";
					case "2" : 
						return "Warning";
					case "3" : 
						return "Error";
					case "4" : 
						return "Error";
					case "5" : 
						return "Success";
					case "6" : 
						return "Success";
					case "7" : 
						return "Error";
					default:
						return "None";
					}
					break;
				case "itsts" :
					switch(sFieldValue){
					case "1" : 
						return "Information";
					case "2" : 
						return "Warning";
					case "3" : 
						return "Error";
					case "4" : 
						return "Success";					
					default:
						return "None";
					}
					break;
				case "aasts" :
					switch(sFieldValue){
					case "A" : 
						return "Success";
					case "B" : 
						return "Error";
					case "C" : 
						return "Warning";
					case "D" : 
						return "Success";
					case "X" : 
						return "Success";
					case "Y" : 
						return "Success";					
					default:
						return "None";
					}
					break;
				case "ircnst" :
					switch(sFieldValue){
					case "1" : 
						return "Error";
					case "2" : 
						return "Warning";
					case "3" : 
						return "Success";
					case "4" : 
						return "Success";
					case "5" : 
						return "Information";
					default:
						return "None";
					}
					break;
				}
				return "None";
			},*/


			getTextInEditModeSource : function(oDataFieldValue) {
				if(oDataFieldValue['sap:value-list'] == "standard"
					&& oDataFieldValue['sap:text']) {
//					return "NavigationProperty";
					return "ValueList";
				}
				return "None";
			},

			createP13NColumnForConnectedFields: function(oInterface, oEntitySetContext, oConnectedColumn, oConnectedDataFields, oDataField, oDataFieldValue, oDataTarget) {
				var sP13N = "",
				sColumnKey = "",
				oP13N = {},
				oEntityType = {},
				aProperties = [],
				iColumnIndex;
				var oContextSet = oInterface.getInterface(0);
				var oModel = oInterface.getInterface(1).getModel();
				// p13nData for Semantically Connected Columns
				var aLeadingPropertiesForSCColumn = [];
				var aNavigationPropertiesForSCColumn = [];
				var aAdditionalPropertiesForSCColumn = [];
				var sActionButton = "false";
				oConnectedDataFields = oConnectedDataFields && oConnectedDataFields.Data;
				for (var i = 0; i < oConnectedDataFields.length; i++) {
					oDataField = oConnectedDataFields[i];
					oModel = oInterface.getInterface(0).getModel();
					oEntityType = oModel.getODataEntityType(oModel.getContext(oInterface.getInterface(0).getPath()).getObject().entityType);
					if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
						if (oDataField.Target.AnnotationPath.indexOf("/") > 0) {
							var sNavigationProperty = oDataField.Target.AnnotationPath.split("/")[0];
							var sAnnotationPath = oDataField.Target.AnnotationPath.split("/")[1].split("@")[1];
							oEntityType = oModel.getODataEntityType(oModel.getODataAssociationEnd(oEntityType, sNavigationProperty).type);
							oDataTarget = oEntityType[sAnnotationPath];
						} else {
							oDataTarget = oEntityType[oDataField.Target.AnnotationPath.split("@")[1]];
						}
					}

					if (((oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") && oDataField.Inline && oDataField.Inline.Bool === "true") || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath") {
						sP13N = zvui.work.controller.AnnotationHelper.createP13NColumnForAction(oContextSet, oDataField);
					} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField") {
						var oSmartFieldData = zvui.work.controller.AnnotationHelper.getRelevantDataForDataField(oModel, oDataField.Value.Path, oEntityType);
						oEntityType = oSmartFieldData.entityType;
						var sDataFieldValuePath = oSmartFieldData.dataFieldValuePath;
						aProperties = (oEntityType && oEntityType.property) || [];
						for (var j = 0; j < aProperties.length; j++) {
							if (aProperties[j].name === sDataFieldValuePath) {
								oDataFieldValue = aProperties[j];
								break;
							}
						}
						sP13N = zvui.work.controller.AnnotationHelper.createP13N(oInterface, oEntitySetContext, oDataFieldValue, oDataField);
					} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
						if (oDataField.Target.AnnotationPath.indexOf("com.sap.vocabularies.Communication.v1.Contact") >= 0) {
							sP13N = zvui.work.controller.AnnotationHelper.createP13NColumnForContactPopUp(oInterface, oEntitySetContext, oDataField, oDataTarget, oDataField.Target.AnnotationPath);
						} else if (oDataField.Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.Chart") >= 0) {
							sP13N = zvui.work.controller.AnnotationHelper.createP13NColumnForChart(oInterface, oEntitySetContext, oDataField, oDataTarget, oDataField.Target.AnnotationPath);
						} else if (oDataTarget.Visualization) {
							sP13N = zvui.work.controller.AnnotationHelper.createP13NColumnForIndicator(oInterface, oEntitySetContext, oDataFieldValue, oDataField, oDataTarget, oDataTarget.Value, oDataField.Target.AnnotationPath);
						}
					}

					if (sP13N) {
						oP13N = JSON.parse(sP13N.replace(/\\/g, ""));
					}
					if (!aLeadingPropertiesForSCColumn.length && oP13N.leadingProperty) {
						aLeadingPropertiesForSCColumn.push(oP13N.leadingProperty);
					} else {
						oP13N.leadingProperty && (aAdditionalPropertiesForSCColumn.indexOf(oP13N.leadingProperty) === -1) ? aAdditionalPropertiesForSCColumn.push(oP13N.leadingProperty) : jQuery.noop;
					}
					oP13N.navigationProperty && (aNavigationPropertiesForSCColumn.indexOf(oP13N.navigationProperty) === -1) ? aNavigationPropertiesForSCColumn.push(oP13N.navigationProperty) : jQuery.noop;
					oP13N.additionalProperty && (aAdditionalPropertiesForSCColumn.indexOf(oP13N.additionalProperty) === -1) ? aAdditionalPropertiesForSCColumn.push(oP13N.additionalProperty) : jQuery.noop;
					if (sActionButton === "false") {
						sActionButton = oP13N.actionButton;
					}
				}
				sP13N = "";
				sColumnKey = zvui.work.controller.AnnotationHelper.createP13NColumnKey(oConnectedColumn);
				iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex(oInterface.getInterface(1));

				sP13N = '\\{"columnKey":"' + sColumnKey;
				sP13N += '", "columnIndex":"' + iColumnIndex;

				sP13N += '", "sortProperty":"' + "";
				sP13N += '", "filterProperty":"' + "";

				if (aLeadingPropertiesForSCColumn.length > 0) {
					sP13N += '", "leadingProperty":"' + aLeadingPropertiesForSCColumn.join();
				}
				if (aNavigationPropertiesForSCColumn.length > 0) {
					sP13N += '", "navigationProperty":"' + aNavigationPropertiesForSCColumn.join();
				}
				if (aAdditionalPropertiesForSCColumn.length > 0) {
					sP13N += '", "additionalProperty":"' + aAdditionalPropertiesForSCColumn.join();
				}

				sP13N += '", "actionButton":"' + sActionButton + '"';
				sP13N += ' \\}';
				return sP13N;
			},

			// returns the enablement expression for Delete buttons on Object Page toolbars
			/*buildDeleteButtonEnablementExpression: function (mFacet, oTabItem) {
			var sButtonId = sap.suite.ui.generic.template.js.StableIdHelper.getStableId({
				type: "ObjectPageAction",
				subType: "Delete",
				sFacet: zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(mFacet)
			});
			return "{= !!${_templPriv>/generic/controlProperties/" + sButtonId + "/enabled}}";
		},*/

			tabItemHasPresentationVariant: function(oEntityType, sVariantAnnotationPath) {
				var oVariant = oEntityType[sVariantAnnotationPath];
				return !!(oVariant && (oVariant.PresentationVariant || oVariant.Visualizations || oVariant.SortOrder));
			},

			getPresentationVariant: function(oVariant, oEntityType) {
				if (oVariant.Visualizations || oVariant.SortOrder) {
					// oVariant is a PresentationVariant
					return oVariant;
				} else if (oVariant.PresentationVariant && oVariant.PresentationVariant.Path) {
					// oVariant is a SelectionPresentationVariant referencing a PresentationVariant via Path
					return oEntityType[oVariant.PresentationVariant.Path.replace('@', '')];
				} else if (oVariant.PresentationVariant) {
					// oVariant is a SelectionPresentationVariant containing a PresentationVariant
					return zvui.work.controller.AnnotationHelper.getPresentationVariant(oVariant.PresentationVariant);
				}
			},

			getPresentationVariantVisualisation: function(oEntityType, sVariantAnnotationPath) {
				var oVariant = oEntityType[sVariantAnnotationPath];
				var oPresentationVariant = zvui.work.controller.AnnotationHelper.getPresentationVariant(oVariant, oEntityType);
				if (oPresentationVariant.Visualizations) {
					return oPresentationVariant.Visualizations[0].AnnotationPath.split('#')[1];
				}
			},

			getPresentationVariantSortOrder: function(oEntityType, sVariantAnnotationPath) {
				var oVariant = oEntityType[sVariantAnnotationPath];
				var oPresentationVariant = zvui.work.controller.AnnotationHelper.getPresentationVariant(oVariant, oEntityType);
				if (oPresentationVariant.SortOrder) {
					return zvui.work.controller.AnnotationHelper.getSortOrder(oPresentationVariant.SortOrder);
				}
			},

			// the following getXYId and getIconTabFilterKey/Text methods are needed for the table tab mode to correctly initialize the table instances
			// use same IDs as for non-table-tab mode and add a unique suffix (table tab filter key)
			// TODO move to list report annotation helper
			getSmartTableId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "listReport";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getAnalyticalTableId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "analyticalTable";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getGridTableId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "GridTable";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getTreeTableId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "TreeTable";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getRowActionsId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "rowActions";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getResponsiveTableId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "responsiveTable";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getAddEntryId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "addEntry";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getDeleteEntryId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "deleteEntry";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getShowDetailsId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "showDetails";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getDraftObjectMarkerId: function(oTabItem) {
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				var sResult = "DraftObjectMarker";
				if (sSuffix) {
					sResult = sResult.concat(sSuffix);
				}
				return sResult;
			},

			getBreakoutActionButtonId: function(oCustomAction, oTabItem) {
				if (oCustomAction.id) {
					var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
					var sResult = oCustomAction.id;
					if (sSuffix) {
						sResult = sResult.concat(sSuffix);
					}
					return sResult;
				}
			},

			getIconTabFilterKey: function(oTabItem) {
				if (oTabItem) {
					if (oTabItem.key) {
						return oTabItem.key;
					} else {
						return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oTabItem.annotationPath);
					}
				}
			},

			getSuffixFromIconTabFilterKey: function(oTabItem) {
				var sKey = zvui.work.controller.AnnotationHelper.getIconTabFilterKey(oTabItem);
				if (sKey) {
					return "-".concat(sKey);
				} else {
					return "";
				}
			},

			getIconTabFilterText: function(oInterface, oManifestEntry, oTarget) {
				var oModel, oData, oMetaModel, oEntitySet, sEntityType, oEntityType, oMainEntityType, oAssociationEnd;
				if (oTarget) {
					//Called from MultipleViews in Object Page
					//In this case, the Annotation will be fetched from the associated entity which the Object Page table uses.
					var sTargetAnnotationPath = oTarget.AnnotationPath;
					var sTarget = sTargetAnnotationPath && sTargetAnnotationPath.substring(0, sTargetAnnotationPath.indexOf('/'));
					oModel = oInterface.getInterface(0).getModel();
					oData = oModel.getData();
					oMetaModel = oData.metaModel;
					oMainEntityType = oMetaModel.getODataEntityType(oData.entityType);
					oAssociationEnd = oMetaModel.getODataAssociationEnd(oMainEntityType, sTarget);
					oEntityType = oMetaModel.getODataEntityType(oAssociationEnd.type); //oEntityType here refers to the Associated Entity used by the OP Table
				} else {
					oModel = oInterface.getModel();
					oData = oModel.getData();
					oMetaModel = oData.metaModel;
					if (!!oManifestEntry.entitySet) { // that is true for table tabs with different entity sets
						oEntitySet = oMetaModel.getODataEntitySet(oManifestEntry.entitySet);
						sEntityType = oEntitySet.entityType;
					} else {
						sEntityType = oData.entityType;
					}
					oEntityType = oMetaModel.getODataEntityType(sEntityType);
				}
				var oSelectionVariant = oEntityType[oManifestEntry.annotationPath];
				if (oSelectionVariant && oSelectionVariant.Text) {
					return oSelectionVariant.Text.String;
				}
			},

			getAltTextForImage: function(oDataFieldValue) {
				if (oDataFieldValue["com.sap.vocabularies.Common.v1.Text"]) {
					return oDataFieldValue["com.sap.vocabularies.Common.v1.Text"].String;
				}
			},
			getActionButtonVisibility: function (oInterface, oDatafield) {
				var sAction = oDatafield["Action"] && oDatafield["Action"].String;
				sAction = sAction && sAction.split("/")[1];
				if (sAction) {
					var oAction = oInterface.getModel().getODataFunctionImport(sAction);
				}
				return !!oAction;

			},

			isTableButtonEnabled : function(showDetailDetail,oEntitySet){
				if(!showDetailDetail){
					showDetailDetail = false;
				}
				return "{parts: [{value: " + showDetailDetail + "} , {path: 'viewModel>/drilldown'} , {path: 'viewModel>/" + oEntitySet.name + "_rowSelected'}], formatter: 'zvui.work.controller.AnnotationHelper.isSmartTableButtonEnabled'}";
			},

			isSmartTableButtonEnabled: function(showDetailDetail,drilldown,rowSelected) {
				if(showDetailDetail){
					if(rowSelected){
						return true;
					}else{
						return false;
					}
				}else{
					if(drilldown){
						return false;
					}else{
						if(rowSelected){
							return true;
						}else{
							return false;
						}
					}
				}
			},

			// returns the 'enabled' value for a button based on annotations
			buildAnnotatedActionButtonEnablementExpression: function (mInterface, mDataField, mFacet, mEntityType, bIsPhone) {
				var mFunctionImport, sButtonId, sAction, oMetaModel;

				// WORKAROUND: as analytical table/chart is not yet fully capable of supporting applicable path (issues with analytical binding), we always set enabled to true
				// Commenting down the below code, as we tested it now and it seems to have no issues now
				// if (mEntityType && mEntityType["sap:semantics"] === "aggregate" && !bIsPhone) {
				// 	return true;
				// }
				// END OF WORKAROUND

				sAction =  mDataField && mDataField.Action && mDataField.Action.String;
				if (sAction) {
					sButtonId = zvui.work.controller.AnnotationHelper.getStableIdPartForDatafieldActionButton(mDataField, mFacet, oTabItem, oChartItem);
					// if RecordType is UI.DataFieldForIntentBasedNavigation and RequiresContext is not "false" (default value is "true") then return binding expression
					if (mDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
						if (!mDataField.RequiresContext || mDataField.RequiresContext.Bool !== "false") {
							return "{= !!${_templPriv>/generic/controlProperties/" + sButtonId + "/enabled}}";
						}
					} else if (mDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
						oMetaModel = mInterface.getInterface(0).getModel();
						mFunctionImport = oMetaModel.getODataFunctionImport(sAction);
						// if RecordType is UI.DataFieldForAction and if sap:action-for is defined then return binding expression
						if (!mFunctionImport) {
							Log.error("The function import " + sAction + " is not defined in the metadata. Buttons that call this function import will not behave as expected.");
							return false;
						} else if (mFunctionImport["sap:action-for"] && mFunctionImport["sap:action-for"] !== "" && mFunctionImport["sap:action-for"] !== " ") {
							return "{= !!${_templPriv>/generic/controlProperties/" + sButtonId + "/enabled}}";
						}
					}

					return true; // default enabled value for annotated actions
				}
			},

			getLabelForDFwithIBN: function (oInterface, oDataField, oEntitySet, oGroupFacet) {
				var oModel, oTargetEntitySet, oEntityType, oProperty, sResult;
				if (oDataField.Label) {
					return oDataField.Label.String;
				} else {
					oModel = oInterface.getInterface(0).getModel();
					if (oModel && oEntitySet) {
						if (oGroupFacet && oGroupFacet.Target && oGroupFacet.Target.AnnotationPath) {
							oTargetEntitySet = zvui.work.controller.AnnotationHelper.getTargetEntitySet(oModel, oEntitySet, oGroupFacet.Target.AnnotationPath);
							oEntityType = oModel.getODataEntityType(oTargetEntitySet.entityType);
						} else {
							oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
						}
						if (oDataField.Value && oDataField.Value.Path) {
							oProperty = oModel.getODataProperty(oEntityType, oDataField.Value.Path);
							sResult = (oProperty["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
							return sResult;
						}
					}
				}
			},

			getLinkTextForDFwithIBN: function(oInterface, oDataField, oEntitySet, oGroupFacet) {
				var oEntityType, oTargetEntitySet, oProperty, sResultPath;
				var oModel = oInterface.getInterface(0).getModel();
				if (oModel && oEntitySet) {
					if (oGroupFacet && oGroupFacet.Target && oGroupFacet.Target.AnnotationPath) {
						oTargetEntitySet = zvui.work.controller.AnnotationHelper.getTargetEntitySet(oModel, oEntitySet, oGroupFacet.Target.AnnotationPath);
						oEntityType = oModel.getODataEntityType(oTargetEntitySet.entityType);
					} else {
						oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
					}
					if (oDataField.Value && oDataField.Value.Path) {
						oProperty = oModel.getODataProperty(oEntityType, oDataField.Value.Path) || {};
						sResultPath = (oProperty["com.sap.vocabularies.Common.v1.Text"] || oDataField.Value).Path || "";
						var sTextArrangement;
						if (oProperty["com.sap.vocabularies.Common.v1.Text"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
							sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
									oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
							var sTextArrangementPath;
							switch (sTextArrangement) {
							case "idAndDescription":
								sTextArrangementPath = "{parts: [{path: '" + oDataField.Value.Path + "'} , {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							case "idOnly":
								sTextArrangementPath = "{" + oDataField.Value.Path + "}";
								break;
							case "descriptionOnly":
								if(oProperty["com.sap.vocabularies.Common.v1.Text"]){
									sTextArrangementPath = "{" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "}";
								}else{
									sTextArrangementPath = "{" + oDataField.Value.Path + "}";									
								}
								break;
							case "descriptionAndId":
								sTextArrangementPath = "{parts: [ {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'} , {path: '" + oDataField.Value.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							default:
								sTextArrangementPath = "{" + sResultPath + "}";
							break;
							}
							return sTextArrangementPath;
						}else{
							return "{" + sResultPath + "}";
						}
					}
				}
			},
			getLinkTextBasedOnTextArrangement: function(text1, text2){
				if(text1 && text2){
					return text1 + " (" + text2 + ")";
				}else if(text1){
					return text1;
				}else{
					return text2;
				}
			},
			getPersistenceKey: function(oEntityType){
//				return oEntityType.namespace;
				return "{parts: [{value: '" + oEntityType.namespace + "'} , {path: 'viewModel>/wstyp'} , {path: 'viewModel>/wspvw'}], formatter: 'zvui.work.controller.AnnotationHelper.getPersistenceKeyforView'}";
			},

			getPersistenceKeyforView: function(sNamespace,wstyp,wspvw){
				var persistenceKey = sNamespace + "_" + wspvw;
				return persistenceKey;
//				return oNavigationData.wstyp + "_" + oNavigationData.wspvw;
			},

			getTargetEntitySet: function(oModel, oSourceEntitySet, sAnnotationPath) {
				var aNavigationProperty, sNavigationProperty, oEntityType, oAssociationEnd;
				aNavigationProperty = sAnnotationPath.split('/');
				if (aNavigationProperty.length > 1) {
					sNavigationProperty = aNavigationProperty[0];
				}
				if (sNavigationProperty) {
					oEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);
					oAssociationEnd = oModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty);
					if (oAssociationEnd && oAssociationEnd.entitySet) {
						return oModel.getODataEntitySet(oAssociationEnd.entitySet);
					}
				}
				return oSourceEntitySet;
			},

			// returns the applicable-path - which is set to the property 'requestAtLeastFields' on the SmartChart
			// the requestAtLeastFields property will add to the $select OData parameter in order to get the necessary data
			getApplicablePathForChartToolbarActions: function (oInterface, mChartAnnotation, sEntityType) {
				var oMetaModel = oInterface.getInterface(0).getModel();
				var mEntityType = oMetaModel.getODataEntityType(sEntityType);
				var aActions = (mChartAnnotation && mChartAnnotation.Actions) || [];
				var sFunctionImport, mFunctionImport, mODataProperty, aFunctionImport = [], aApplicablePath = [], sApplicablePath;

				// check each annotation for UI.DataFieldForAction and verify that Inline & Determining are not set to true, which will imply that the Action is a toolbar action (based on Actions Concept)
				for (var i = 0; i < aActions.length; i++) {
					if (aActions[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" &&
							(!aActions[i].Inline || aActions[i].Inline.Bool !== "true") && (!aActions[i].Determining || aActions[i].Determining.Bool !== "true")) {
						sFunctionImport = aActions[i].Action && aActions[i].Action.String;
						mFunctionImport = oMetaModel.getODataFunctionImport(sFunctionImport);
						if (mFunctionImport) {
							aFunctionImport.push(mFunctionImport);
						}
					}
				}

				for (var i = 0; i < aFunctionImport.length; i++) {
					// verify that both the sap:action-for and sap:applicable-path annotation are applied to the function import
					mFunctionImport = aFunctionImport[i];
					if (mFunctionImport &&
							mFunctionImport["sap:action-for"] && mFunctionImport["sap:action-for"] !== "" && mFunctionImport["sap:action-for"] !== " " &&
							mFunctionImport["sap:applicable-path"] && mFunctionImport["sap:applicable-path"] !== "" && mFunctionImport["sap:applicable-path"] !== " ") {
						sApplicablePath = mFunctionImport["sap:applicable-path"];
						mODataProperty = oMetaModel.getODataProperty(mEntityType, sApplicablePath);

						// the applicable-path needs to point to a property that has the annotation 'sap:aggregation-role' equal to 'dimension' (and not 'measure' for example)
						if (mODataProperty && mODataProperty["sap:aggregation-role"] === "dimension") {
							aApplicablePath.push(sApplicablePath);
						} else {
							Log.error("AnnotationHelper.js - method getApplicablePathForChartToolbarActions: the applicable-path " + sApplicablePath +
							" is either pointing to an entity type property which doesn't exist or does not have 'sap:aggregation-role' set to to 'dimension'.");
						}
					}
				}

				// if there are applicable paths in aApplicablePath, then return a comma separated string which contains each applicable path - e.g. ["property1", "property2"] -> "property1, property2"
				if (aApplicablePath.length > 0 ) {
					return aApplicablePath.join();
				}
			},

			// build expression binding for bread crumbs
			buildBreadCrumbExpression: function (oContext, oTitle, oTypeName) {
				var sBinding,
				sBindingTitle = sap.ui.model.odata.AnnotationHelper.format(oContext, oTitle);

				if (oTitle && oTitle.Path && oTypeName && oTypeName.String) {
					var sTypeNameEscaped = oTypeName.String.replace(/'/g, "\\'");
//					sBinding = "{= $" + sBindingTitle + " ? '" + sTypeNameEscaped  + " ('$" + sBindingTitle + "')' : '" + sTypeNameEscaped + "' }";
					sBinding = sTypeNameEscaped + " ({path: '" + oTitle.Path + "'})";
					return sBinding;
				} else {
					// in case of a complex binding of the title we do not introduce our default text fallback
					if (!sBindingTitle) {
						// string "[[no title]]" should never been shown in UI therefore no transaltion needed
						return oTypeName && oTypeName.String || "[[no title]]";
					}
					return sBindingTitle;
				}
			},


			// builds the expression for the Rating Indicator Subtitle
			buildRatingIndicatorSubtitleExpression: function (mSampleSize) {
				if (mSampleSize) {
					return "{parts: [{path: '" + mSampleSize.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatRatingIndicatorSubTitle'}";
				}
			},

			// returns the text for the Rating Indicator Subtitle (e.g. '7 reviews')
			formatRatingIndicatorSubTitle: function (iSampleSizeValue) {
				if (iSampleSizeValue) {
					var oResBundle = this.getModel("i18n").getResourceBundle();
					if (this.getCustomData().length > 0) {
						return oResBundle.getText("RATING_INDICATOR_SUBTITLE", [iSampleSizeValue, this.data("Subtitle")]);
					} else {
						var sSubTitleLabel = iSampleSizeValue > 1 ? oResBundle.getText("RATING_INDICATOR_SUBTITLE_LABEL_PLURAL") : oResBundle.getText("RATING_INDICATOR_SUBTITLE_LABEL");
						return oResBundle.getText("RATING_INDICATOR_SUBTITLE", [iSampleSizeValue, sSubTitleLabel]);
					}
				}
			},

			// builds the expression for the Rating Indicator footer
			buildRatingIndicatorFooterExpression: function (mValue, mTargetValue) {
				if (mTargetValue) {
					return "{parts: [{path: '" + mValue.Path + "'}, {path: '" + mTargetValue.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatRatingIndicatorFooterText'}";
				}
				return "{parts: [{path: '" + mValue.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatRatingIndicatorFooterText'}";
			},

			// returns the text for the Rating Indicator footer (e.g. '2 out of 5')
			// note: the second placeholder (e.g. "5") for the text "RATING_INDICATOR_FOOTER" can come one from the following:
			// i. if the Property TargetValue for the term UI.DataPoint is a Path then the value is resolved by the method buildRatingIndicatorFooterExpression and passed to this method as 'targetValue'
			// ii. if the Property TargetValue is not a Path (i.e. 'Decimal') then we get the value from the control's Custom Data
			// iii. if neither i. or ii. apply then we use the default max value for the sap.m.RatingIndicator control
			formatRatingIndicatorFooterText: function (value, targetValue) {
				if (value) {
					var oResBundle = this.getModel("i18n").getResourceBundle();
					if (targetValue) {
						return oResBundle.getText("RATING_INDICATOR_FOOTER", [value, targetValue]);
					} else if (this.getCustomData().length > 0) {
						return oResBundle.getText("RATING_INDICATOR_FOOTER", [value, this.data("Footer")]);
					} else {
						var iRatingIndicatorDefaultMaxValue = sap.m.RatingIndicator.getMetadata().getPropertyDefaults().maxValue;
						return oResBundle.getText("RATING_INDICATOR_FOOTER", [value, iRatingIndicatorDefaultMaxValue]);
					}
				}
			},

			// builds the expression for the Rating Indicator aggregate Ccunt
			buildRatingIndicatorAggregateCountExpression: function (mValue) {
				return "{parts: [{path: '" + mValue.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatRatingIndicatorAggregateCount'}";
			},

			// returns the text for the Rating Indicator aggregated count (e.g. (243))
			formatRatingIndicatorAggregateCount: function (value) {
				var oResBundle = this.getModel("i18n").getResourceBundle();
				var sText;
				if (value) {
					sText = oResBundle.getText("RATING_INDICATOR_AGGREGATE_COUNT", [value]);
				} else if (this.getCustomData().length > 0) {
					sText = oResBundle.getText("RATING_INDICATOR_AGGREGATE_COUNT", [this.data("AggregateCount")]);
				} else {
					sText = "";
				}

				return sText;
			},

			getEditActionButtonVisibility: function (oInterface, mRestrictions, oEntitySet ) { //, bParameterEdit, bIsDraftEnabled) {
				//Standard behaviour is that EDIT Button visbility is bound to ui>/editable
				//if an external EDIT has been specified in the manifest with bParameterEdit this can also be restricted by an applicable path
				var	oMetaModel = oInterface.getInterface(0).getModel();
				var sEntityType = oEntitySet.entityType;

				if (zvui.work.controller.AnnotationHelper._areUpdateRestrictionsValid(oMetaModel, sEntityType, mRestrictions)) {
					var sUIEditableExpression = "!${ui>/editable}";
					// var sNotOwnDraft = "!${DraftAdministrativeData/DraftIsCreatedByMe}";

					if (mRestrictions) {
						if (mRestrictions.Updatable.Path) {
							zvui.work.controller.AnnotationHelper._actionControlExpand(oInterface, mRestrictions.Updatable.Path, sEntityType);
							// if (bIsDraftEnabled) {
							// 	// Not to show 'Edit' button when there is an own draft. Instead show 'Continue Editing'
							// 	oAnnotationHelper.formatWithExpandSimple(oInterface, {Path : "DraftAdministrativeData/DraftIsCreatedByMe"}, oEntitySet); // This is to add navigation parameters to the request.
							// 	return "{= ${" + mRestrictions.Updatable.Path + "} && " + sUIEditableExpression + " && " + sNotOwnDraft + "}";
							// } else {
							return "{= ${" + mRestrictions.Updatable.Path + "} ? " + sUIEditableExpression + " : false}";
							// }
						} else if (mRestrictions.Updatable.Bool === "false") {
							return false;
						}
						// } else if (bIsDraftEnabled) {
						// 	// Not to show 'Edit' button when there is an own draft. Instead show 'Continue Editing'
						// 	oAnnotationHelper.formatWithExpandSimple(oInterface, {Path : "DraftAdministrativeData/DraftIsCreatedByMe"}, oEntitySet);// This is to add navigation parameters to the request.
						// 	return "{= (" + sNotOwnDraft + " && " + sUIEditableExpression + ") }";
					}
					return "{=" + sUIEditableExpression + "}";
				} else {
					return false;
				}
			},

			/*To get the expression for visibility of delete button in Draft and NonDraft Applications
		In Draft applications, delete button is visible in Display mode on Object page
		in NonDraft applications delete button is visible in Display as well as edit mode.
			 */
			getDeleteActionButtonVisibility: function (oInterface, mRestrictions, sEntityType, bIsDraftEnabled) {
				var	oMetaModel = oInterface.getInterface(0).getModel();
				if (zvui.work.controller.AnnotationHelper.areDeleteRestrictionsValid(oMetaModel, sEntityType, mRestrictions)) {
					// if (bIsDraftEnabled) {
					var sUIEditableExpression = "!${ui>/editable}";
					// } else {
					// 	var sUIEditableExpression = "!${ui>/createMode}";
					// }
					if (mRestrictions) {
						if (mRestrictions.Deletable.Path) {
							zvui.work.controller.AnnotationHelper._actionControlExpand(oInterface, mRestrictions.Deletable.Path, sEntityType);
							return "{= ${" + mRestrictions.Deletable.Path + "} ? " + sUIEditableExpression + " : false}";
						} else if (mRestrictions.Deletable.Bool === "false") {
							return false;
						}
					}
					return "{=" + sUIEditableExpression + "}";
				} else {
					return false;
				}
			},

			/*This Function is to determine the visibility of delete button in sub object page.
		In Draft applications, delete button is visible in edit mode on SubObject page
		in NonDraft applications delete button is visible in Display as well as edit mode.
			 */
			getSubObjPageDeleteActionButtonVisibility: function (oInterface, mRestrictions, sEntityType, bIsDraftEnabled) {
				var	oMetaModel = oInterface.getInterface(0).getModel();
				var sUIEditableExpression;

				if (zvui.work.controller.AnnotationHelper.areDeleteRestrictionsValid(oMetaModel, sEntityType, mRestrictions)) {
					// if (bIsDraftEnabled == true) {
					sUIEditableExpression = "${ui>/editable}";
					// } else {
					// 	sUIEditableExpression = "!${ui>/createMode}";
					// }
					if (mRestrictions) {
						if (mRestrictions.Deletable.Path) {
							zvui.work.controller.AnnotationHelper._actionControlExpand(oInterface, mRestrictions.Deletable.Path, sEntityType);
							return "{= ${" + mRestrictions.Deletable.Path + "} ? " + sUIEditableExpression + " : false}";
						} else if (mRestrictions.Deletable.Bool === "false") {
							return false;
						}
					}
					return "{=" + sUIEditableExpression + "}";
				} else {
					return false;
				}
			},

			getIdForMoreBlockContent : function(oFacet){
				if (oFacet["com.sap.vocabularies.UI.v1.PartOfPreview"] && oFacet["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "false"){
					return "::MoreContent";
				}
			},

			checkMoreBlockContent : function(oFacetContext){
				return zvui.work.controller.AnnotationHelper.checkFacetContent(oFacetContext, false);
			},

			checkBlockContent : function(oFacetContext){
				return zvui.work.controller.AnnotationHelper.checkFacetContent(oFacetContext, true);
			},

			checkFacetContent : function(oFacetContext, bBlock){
				var sPath;
				var oInterface = oFacetContext.getInterface(0);
				var aFacets = oFacetContext.getModel().getProperty("", oFacetContext);

				//for Reference Facets directly under UI-Facets we need to check facets one level higher - by removing the last part of the path
				var aForPathOfFacetOneLevelHigher = oFacetContext.getPath().split("/Facets");
				var sContextOfFacetOneLevelHigher = oInterface.getModel().getContext(aForPathOfFacetOneLevelHigher[0]);
				if (oInterface.getModel().getProperty('', sContextOfFacetOneLevelHigher).RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet"){
					return sContextOfFacetOneLevelHigher.getPath();
				} else {
					if (!aFacets){
						return;
					}

					for (var iFacet = 0; iFacet < aFacets.length; iFacet++) {
						if (!bBlock){
							if (aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"] && aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "false"){
								sPath = oInterface.getPath() + "/" + iFacet;
								break;
							}
						} else {
							if (aFacets[iFacet].RecordType !== "com.sap.vocabularies.UI.v1.ReferenceFacet" || (!aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"] || aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "true")){
								sPath = oInterface.getPath() + "/" + iFacet;
								break;
							}
						}
					}
				}

				return sPath;
			},

			// Checks whether inline-create feature has been configured for the given facet
			isInlineCreate : function(oFacet, oSections){
				var oSettings = oSections[zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet)];
				return !!(oSettings && oSettings.createMode && oSettings.createMode === "inline");
			},

			// Checks whether use of the preliminaryContext feature has been configured for the given facet
			usesPreliminaryContext: function(oFacet, oSections){
				var oSettings = oSections[zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet)];
				return !!(oSettings && oSettings.preliminaryContext);
			},
			//check whether HasActityEntity sort order(Inline Create mode) has been configured for the given facet(table)
			isInlineCreateSorting : function(oFacet, oSections) {
				var oSettings = oSections[zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet)];
				return !!(oSettings && oSettings.disableDefaultInlineCreateSort);
			},
			/**
			 * Function to find out the type of table to be rendered on UI
			 * @param {object} oFacet - Object containing information about a facet
			 * @param {object} oSections - Object containing manifest settings of Object Page
			 */
			determineTableType: function(oFacet, oSections) {
				var oSettings; 				// contains properties of sections in object page
				if (oSections && oSections.sections) {
					oSettings = oSections.sections[zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet)];
				}
				return (oSettings && (((oSettings.tableType || oSettings.treeTable)) || (oSections && oSections.tableType)));
			},

			isImageUrl : function(oPropertyAnnotations) {
				var oShowImage = oPropertyAnnotations["com.sap.vocabularies.UI.v1.IsImageURL"] || oPropertyAnnotations["com.sap.vocabularies.UI.v1.IsImageUrl"];
				if (oShowImage && oShowImage.Bool && oShowImage.Bool === "false") {
					return false;
				} else if (oShowImage) {
					return true;
				}
				return false;
			},
			isPropertySemanticKey : function (oInterface, oEntitySet, oProperty) {
				var oInterface = oInterface.getInterface(0);
				var oMetaModel = oInterface.getModel();
				var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				if (oEntityType) {
					var aSemKeyAnnotation = oEntityType["com.sap.vocabularies.Common.v1.SemanticKey"];
					if (aSemKeyAnnotation && aSemKeyAnnotation.length > 0) {
						for (var i = 0; i < aSemKeyAnnotation.length; i++) {
							if (aSemKeyAnnotation[i].PropertyPath === oProperty.Path) {
								return true;
							}
						}
					}
				}
				return false;
			},
			// Handling of image urls
			//
			// If images are included in the UI app they need to specify the path relatively (e.g. images/image.jpg) to support
			// different platforms like ABAP and HCP. The relative path has to be used because the absolute paths differ from platform
			// to platform. The rule is if the image url doesn't start with a / or sap-icon:// or http(s):// then it's a relative url and the absolute
			// path has to be added by the framework. This path can be retrieved with jQuery.sap.getModulePath and the component name.

			_addFullPathToImageUrlIfNeeded: function (sImageUrl, sAppComponentName) {
				if (!sImageUrl) {
					return "";
				}
				if ((sImageUrl.substring(0,1) === "/") || (sImageUrl.substring(0,11) === "sap-icon://")
						|| (sImageUrl.substring(0,7) === "http://") || (sImageUrl.substring(0,8) === "https://")) {
					// Absolute URL, nothing has to be changed
					return sImageUrl;
				} else {
					// Relative URL, has to be adjusted
					return jQuery.sap.getModulePath(sAppComponentName, "/") + sImageUrl;
				}
			},

			formatImageUrl: function(oInterface, oImageUrl, sAppComponentName, bExpand) {
				if (oImageUrl && (oImageUrl.Path || oImageUrl.Apply) && bExpand) {
					oAnnotationHelper.formatWithExpandSimple(oInterface, oImageUrl);
				}
				if (oImageUrl && oImageUrl.Path) {
					return "{parts: [{path: '" + oImageUrl.Path + "'}, {path: '_templPrivGlobal>/generic/appComponentName'}], formatter: 'zvui.work.controller.AnnotationHelper.formatImageUrlRuntime'}";
				} else if (oImageUrl && oImageUrl.String) {
					return oAnnotationHelper._addFullPathToImageUrlIfNeeded(oImageUrl.String, sAppComponentName);
				} else if (oImageUrl && oImageUrl.Apply) {
					oImageUrl.Apply.Parameters[0].Value = oAnnotationHelper._addFullPathToImageUrlIfNeeded(oImageUrl.Apply.Parameters[0].Value, sAppComponentName);
					return sap.ui.model.odata.AnnotationHelper.format(oInterface, oImageUrl);
				} else {
					return "";
				}
			},

			hasImageUrl: function(oImageUrl) {
				if (oImageUrl && (oImageUrl.Path || oImageUrl.Apply || oImageUrl.String)) {
					return "sapSmartTemplatesObjectPageDynamicPageHeader sapSmartTemplatesObjectPageDynamicPageHeaderImageDiv";
				} else {
					return "sapSmartTemplatesObjectPageDynamicPageHeader";
				}
			},

			hasImageUrlForHeaderTitle: function(oImageUrl) {
				if (oImageUrl && (oImageUrl.Path || oImageUrl.Apply || oImageUrl.String)) {
					return "sapSmartTemplatesObjectPageDynamicPageHeaderTitle sapSmartTemplatesObjectPageDynamicPageHeaderTitleWithImage sapSmartTemplatesObjectPageDynamicPageHeaderImageDiv";
				} else {
					return "sapSmartTemplatesObjectPageDynamicPageHeaderTitle sapSmartTemplatesObjectPageDynamicPageHeaderTitleWithoutImage";
				}
			},

			formatImageOrTypeUrl: function(oInterface, oInputImageUrl, oTypeImageUrl, sAppComponentName, bExpand) {
				var oImageUrl = null;
				if (oInputImageUrl) {
					oImageUrl = oInputImageUrl;
				} else {
					oImageUrl = oTypeImageUrl;
				}
				return oAnnotationHelper.formatImageUrl(oInterface, oImageUrl, sAppComponentName, bExpand);
			},

			getPathWithExpandFromHeader: function(oInterface, oEntitySet, sNavigationProperty, oInputImageUrl, oTypeImageUrl) {
				var aExpand = [], sNavigationPath;
				if (( oInputImageUrl || oTypeImageUrl )){
					var oInterface = oInterface.getInterface(0);
					var oMetaModel = oInterface.getModel();
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

					//check for the image path
					var oImageUrl = null;
					if (oInputImageUrl) {
						oImageUrl = oInputImageUrl;
					} else {
						oImageUrl = oTypeImageUrl;
					}

					if (oImageUrl && oImageUrl.Path && oEntityType){
						//var oMetaModel = oInterface.getInterface(0).getModel(); does not include the full metamodel
						var sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oImageUrl.Path);
						if (sExpand){
							aExpand.push(sExpand);
						}
					}
				}

				if (aExpand.length > 0) {
					if (aExpand.length > 1) {
						//remove duplicates
						aExpand = aExpand.filter(function(elem, index, self) {
							return index == self.indexOf(elem);
						});
					}
					sNavigationPath = "{ path : '" + sNavigationProperty + "', parameters : { expand : '" + aExpand.join(',') + "'} }";
				} else {
					sNavigationPath = "{ path : '" + sNavigationProperty + "' }";
				}
				//needed in Non Draft Case: binding="{}" NOT WORKING - the fields are NOT visible and editable after clicking + in List Report
				//XMLTemplateProcessor also supports empty string
				if (sNavigationPath === "{}"){
					sNavigationPath = "";
				}
				return sNavigationPath;
			},

			disableSemanticObjectLinksOnPopups: function(oQuickView, oDataField) {
				var sIgnoredFields = "";
				if (oQuickView && oQuickView.ignoredFields &&
						oDataField && oDataField.Value && oDataField.Value.Path	){
					if (oQuickView.ignoredFields[oDataField.Value.Path]){
						sIgnoredFields = oDataField.Value.Path;
					}
				}
				return sIgnoredFields;
			},

			formatImageUrlRuntime: function (sImageUrl, sAppComponentName) {
				return oAnnotationHelper._addFullPathToImageUrlIfNeeded(sImageUrl, sAppComponentName);
			},

			formatHeaderImage: function (oInterface, oHeaderInfo, sAppComponentName) {
				if (oHeaderInfo.ImageUrl) {
					return oAnnotationHelper.formatImageUrl(oInterface, oHeaderInfo.ImageUrl, sAppComponentName, true);
				} else if (oHeaderInfo.TypeImageUrl) {
					return oAnnotationHelper.formatImageUrl(oInterface, oHeaderInfo.TypeImageUrl, sAppComponentName, true);
				} else {
					return "";
				}
			},

			// Handling of image urls - End

			matchesBreadCrumb: function(oInterface, oCandidate, sPath) {
				if (sPath) {
					var aSections = sPath.split("/");
					var oEntitySet, oEntityType, oAssociationEnd;

					if (aSections.length > 0) {
						// there's at least one section left - crate breadcrumbs
						var oMetaModel = oInterface.getInterface(0).getModel();
						var sEntitySet = aSections[0];

						for (var i = 0; i < aSections.length; i++) {
							if (i > 0) {
								oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
								oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
								oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, aSections[i]);
								sEntitySet = oAssociationEnd.entitySet;
							}

							if ((i + 1) === aSections.length) {
								if (sEntitySet === oCandidate.name) {
									return true;
								} else {
									return false;
								}
							}
						}
					}
				}
			},
			showFullScreenButton : function(oRouteConfig, oFacet) {
				if (oRouteConfig && oFacet) {
					var sFacetId = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					if (oRouteConfig.component
							&& oRouteConfig.component.settings
							&& oRouteConfig.component.settings.sections
							&& oRouteConfig.component.settings.sections[sFacetId]
					&& oRouteConfig.component.settings.sections[sFacetId].tableMode === "FullScreenTable") {
						return true;
					}
				}
				return false;
			},
			getPersistencyKeyForSmartTable : function(oRouteConfig) {
				// ListReport
				return "listReportFloorplanTable";
			},
			getPersistencyKeyForDynamicPageTitle : function(oRouteConfig){
				//Dynamic Page Title
				return "listReportDynamicPageTitle";
			},
			getCreateNavigationIntent: function (sListEntitySet, aSubPages, sAnnotationPath) {
				return getSubObjectPageIntent(sListEntitySet, aSubPages, sAnnotationPath, "create");
			},
			getDisplayNavigationIntent: function (sListEntitySet, aSubPages, sAnnotationPath) {
				return getSubObjectPageIntent(sListEntitySet, aSubPages, sAnnotationPath, "display");
			},
			extensionPointFragmentExists: function (oFacet, sFragmentId) {
				var sId = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				if (sId === sFragmentId) {
					return true;
				} else {
					return false;
				}
			},
			containsFormWithBreakoutAction: function (oFacetCandidate, sIdCriterion) {
				var sCandidateId = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacetCandidate);
				if (sCandidateId === sIdCriterion) {
					if (oFacetCandidate.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet" &&
							oFacetCandidate.Target &&
							oFacetCandidate.Target.AnnotationPath &&
							oFacetCandidate.Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") != -1) {
						return true;
					}
				}
				return false;
			},
			formatWithExpandSimple: function (oInterface, oDataField, oEntitySet) {
				if (!oDataField){
					return "";
				}
				var aExpand = [], sExpand, oEntityType;
				var oMetaModel = oInterface && oInterface.getModel && oInterface.getModel();
				if (!oMetaModel) {
					// called with entity set therefore use the correct interface
					oInterface = oInterface.getInterface(0);
					oMetaModel = oInterface.getModel();
				}

				if (oEntitySet) {
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				} else {
					// TODO: check with UI2 if helper to get entity type can be used, avoid using this path
					var aMatches = /^(\/dataServices\/schema\/\d+\/entityType\/\d+)(?:\/|$)/.exec(oInterface.getPath());
					if (aMatches && aMatches.length && aMatches[0]) {
						var oEntityTypeContext = oMetaModel.getProperty(aMatches[0]);
						var sNamespace = oMetaModel.getODataEntityContainer().namespace;
						oEntityType = oMetaModel.getODataEntityType(sNamespace + '.' + oEntityTypeContext.name);
					}
				}

				if (oEntityType) {
					// check if expand is needed
					if (oDataField && oDataField.Path) {
						sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Path);
						if (sExpand) {
							aExpand.push(sExpand);
						}

					} else if (oDataField && oDataField.Apply && oDataField.Apply.Name === "odata.concat") {
						oDataField.Apply.Parameters.forEach(function (oParameter) {
							if (oParameter.Type === "Path") {
								sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oParameter.Value);
								if (sExpand) {
									if (aExpand.indexOf(sExpand) === -1) {
										aExpand.push(sExpand);
									}
								}
							}
						});
					}

					if (aExpand.length > 0) {
						// we analyze a facet that is part of the root context
						// set expand to expand data bag
						var oPreprocessorsData = oInterface.getSetting("preprocessorsData");
						if (oPreprocessorsData) {
							var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
							for (var j = 0; j < aExpand.length; j++) {
								if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
									aRootContextExpand.push(aExpand[j]);
								}
							}
							oPreprocessorsData.rootContextExpand = aRootContextExpand;
						}

					}
				}

				return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField);
			},

			setQuickFilterId: function(oEntityType,oFacet) {
				if(oEntityType['com.sap.vocabularies.UI.v1.QuickFilter']) {
					return zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet) + "::FilterBar";
				}
				return "";
			},

			showQuickFilter: function(oEntityType) {
				if(oEntityType['com.sap.vocabularies.UI.v1.QuickFilter'])
					return true;
				return false;
			},

			formatWithExpand: function (oInterface, oDataField, oEntitySet) {
				zvui.work.controller.AnnotationHelper.getNavigationPathWithExpand(oInterface, oDataField, oEntitySet);

				oInterface = oInterface.getInterface(0);
				zvui.work.controller.AnnotationHelper.formatWithExpandSimple(oInterface, oDataField, oEntitySet);
				return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField);
			},

			_getNavigationPrefix: function (oMetaModel, oEntityType, sProperty) {
				var sExpand = "";
				var aParts = sProperty.split("/");

				if (aParts.length > 1) {
					for (var i = 0; i < (aParts.length - 1); i++) {
						var oAssociationEnd = oMetaModel.getODataAssociationEnd(oEntityType, aParts[i]);
						if (oAssociationEnd) {
							oEntityType = oMetaModel.getODataEntityType(oAssociationEnd.type);
							if (sExpand) {
								sExpand = sExpand + "/";
							}
							sExpand = sExpand + aParts[i];
						} else {
							return sExpand;
						}
					}
				}

				return sExpand;
			},

			getCurrentPathWithExpand: function (oInterface, oContext, oEntitySetContext, sNavigationProperty ) {
				//oContext is needed to be set for having the correct "context" for oInterface
				oInterface = oInterface.getInterface(0);
				var aExpand = [], sNavigationPath;
				var oMetaModel = oInterface.getModel();
				var oEntitySet = oMetaModel.getODataEntitySet(oEntitySetContext.name || '');
				var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oMetaModel.getContext(oInterface.getPath()));
				var oEntityType = oMetaModel.getODataEntityType(oEntitySetContext.entityType);

				aExpand = zvui.work.controller.AnnotationHelper.getFacetExpand(sResolvedPath, oMetaModel, oEntityType, oEntitySet);

				if (aExpand.length > 0) {
					sNavigationPath = "{ path : '" + sNavigationProperty + "', parameters : { expand : '" + aExpand.join(',') + "'} }";
				} else {
					sNavigationPath = "{ path : '" + sNavigationProperty + "' }";
				}
				//needed in Non Draft Case: binding="{}" NOT WORKING - the fields are NOT visible and editable after clicking + in List Report
				//XMLTemplateProcessor also supports empty string
				if (sNavigationPath === "{}"){
					sNavigationPath = "";
				}
				return sNavigationPath;
			},

			getCurrentPathWithExpandForContact: function (oInterface, oContext, oEntitySetContext, sNavigationProperty) {
				var aExpand = [], sNavigationPath;
				/*
			var sAnnotationPath = oContext && oContext.AnnotationPath;
			if (sAnnotationPath && sAnnotationPath.indexOf('/') > -1) {
				sNavigationProperty = sAnnotationPath.slice(0, sAnnotationPath.indexOf('/'));
			}*/

				//oContext is needed to be set for having the correct "context" for oInterface
				oInterface = oInterface.getInterface(0);

				var oMetaModel = oInterface.getModel();
				var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oMetaModel.getContext(oInterface.getPath()));
				var oEntityType = oMetaModel.getODataEntityType(oEntitySetContext.entityType);

				aExpand = zvui.work.controller.AnnotationHelper.getFacetExpandForContact(sResolvedPath, oMetaModel, oEntityType);

				if (aExpand.length > 0) {
					sNavigationPath = "{ path : '" + sNavigationProperty + "', parameters : { expand : '" + aExpand.join(',') + "'} }";
				} else {
					sNavigationPath = "{ path : '" + sNavigationProperty + "' }";
				}
				//needed in Non Draft Case: binding="{}" NOT WORKING - the fields are NOT visible and editable after clicking + in List Report
				//XMLTemplateProcessor also supports empty string
				if (sNavigationPath === "{}"){
					sNavigationPath = "";
				}
				return sNavigationPath;
			},

			getFacetExpandForContact: function (sResolvedPath, oMetaModel, oEntityType) {
				var aExpand = [], oFacetContent;

				var fnGetDependents = function (sPath) {
					if (sPath){
						var sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sPath);
						if (sExpand) {
							// check if already in expand array - if not yet add it
							if (aExpand.indexOf(sExpand) === -1) {
								aExpand.push(sExpand);
							}
						}
					}
				};

				if (sResolvedPath && sResolvedPath.indexOf("com.sap.vocabularies.Communication.v1.Contact") > -1) {
					oFacetContent = oMetaModel.getObject(sResolvedPath) || {};
					for (var i in oFacetContent) {
						var sPath;
						var oFacetObject = oFacetContent[i];
						if (oFacetObject && oFacetObject.Path) {
							sPath = oFacetObject.Path;
							fnGetDependents(sPath);
						} else if ( Object.prototype.toString.call( oFacetObject ) === '[object Array]' ){
							for (var j in oFacetObject){
								var oArrayEntry = oFacetObject[j];
								if (oArrayEntry && oArrayEntry.uri && oArrayEntry.uri.Path){
									sPath = oArrayEntry.uri.Path;
								}
								if (oArrayEntry && oArrayEntry.address && oArrayEntry.address.Path){
									sPath = oArrayEntry.address.Path;
								}
								fnGetDependents(sPath);
							}
						}
					}
				}
				return aExpand;
			},

			getNavigationPathWithExpand: function (oInterface, oContext, oEntitySetContext, bWithPreliminaryContext) {
				oInterface = oInterface.getInterface(0);
				var oMetaModel = oInterface.getModel();
				var oEntitySet = oMetaModel.getODataEntitySet(oEntitySetContext.name || '');
				var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oMetaModel.getContext(oInterface.getPath()));

				var sNavigationPath = sap.ui.model.odata.AnnotationHelper.getNavigationPath(oInterface, oContext);
				var sNavigationProperty = sNavigationPath.replace("{", "").replace("}", "");
				var oEntityType;
				if (sNavigationProperty) {
					// from now on we need to set the entity set to the target
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty);
					if (oAssociationEnd && oAssociationEnd.entitySet) {
						oEntitySet = oMetaModel.getODataEntitySet(oAssociationEnd.entitySet);
					}
				} else {
					oEntityType = oMetaModel.getODataEntityType(oEntitySetContext.entityType);
					bWithPreliminaryContext = false; // root context does not need preliminary context
				}
				var bAddExpandsToParameters = false;
				var aExpand = oAnnotationHelper.getFacetExpand(sResolvedPath, oMetaModel, oEntityType, oEntitySet);
				var oPreprocessorsData = oInterface.getSetting("preprocessorsData") || {};
				var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
				if (aExpand.length > 0) {
					if (sNavigationProperty) {
						// add expand to navigation path
						bAddExpandsToParameters = true;
					} else {
						// we analyze a facet that is part of the root context
						// set expand to expand data bag
						for (var j = 0; j < aExpand.length; j++) {
							if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
								aRootContextExpand.push(aExpand[j]);
							}
						}
						oPreprocessorsData.rootContextExpand = aRootContextExpand;
					}
				}
				// switch of the preliminary context if batch groups are used and navigation property and all expands are already part of the root context expand
				bWithPreliminaryContext = bWithPreliminaryContext && (aRootContextExpand.indexOf(sNavigationProperty) === -1 || aExpand.some(function(sExpand){
					return aRootContextExpand.indexOf(sNavigationProperty + "/" + sExpand) === -1;
				}));

				if (bAddExpandsToParameters || bWithPreliminaryContext){
					sNavigationPath = "{ path : '" + sNavigationProperty + "', parameters : { ";
					if (bAddExpandsToParameters){
						sNavigationPath = sNavigationPath + "expand : '" + aExpand.join(",") + "'";
						if (bWithPreliminaryContext){
							sNavigationPath = sNavigationPath + ", ";
						}
					}
					if (bWithPreliminaryContext){
						sNavigationPath = sNavigationPath + "usePreliminaryContext: true, batchGroupId: 'facets'";
					}
					sNavigationPath = sNavigationPath + "} }";
				}
				//needed in Non Draft Case: binding="{}" NOT WORKING - the fields are NOT visible and editable after clicking + in List Report
				//XMLTemplateProcessor also supports empty string
				if (sNavigationPath === "{}"){
					sNavigationPath = "";
				}
				return sNavigationPath;
			},

			getFormGroupBindingString: function(oInterface, oContext, oEntitySetContext){
				var sRet = oAnnotationHelper.getNavigationPathWithExpand(oInterface, oContext, oEntitySetContext, true);
				return sRet;
			},

			getFacetExpand: function (sResolvedPath, oMetaModel, oEntityType, oEntitySet){
				var aDependents = [], aExpand = [], oFacetContent, aFacetContent = [];

				if (sResolvedPath) {
					aFacetContent = oMetaModel.getObject(sResolvedPath) || [];
				}

				aFacetContent = aFacetContent.Data || aFacetContent;

				var fnGetDependents = function (sProperty, bIsValue) {
					var sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sProperty);
					if (sExpand) {
						// check if already in expand array - if not yet add it
						if (aExpand.indexOf(sExpand) === -1) {
							aExpand.push(sExpand);
						}
					}
					if (bIsValue) {
						try {
							aDependents = sap.ui.comp.smartfield.SmartField.getSupportedAnnotationPaths(oMetaModel, oEntitySet, sProperty, true) || [];
						} catch (e) {
							aDependents = [];
						}
						for (var i = 0; i < aDependents.length; i++) {
							if (aExpand.indexOf(aDependents[i]) === -1) {
								aExpand.push(aDependents[i]);
							}
						}
					}
				};

				var fnAnalyzeApplyFunctions = function (oParameter) {
					if (oParameter.Type === "LabeledElement") {
						fnGetDependents(oParameter.Value.Path);
					} else if (oParameter.Type === "Path") {
						fnGetDependents(oParameter.Value);
					}
				};

				for (var i = 0; i < aFacetContent.length; i++) {
					oFacetContent = aFacetContent[i];

					if (oFacetContent.Value && oFacetContent.Value.Path) {
						fnGetDependents(oFacetContent.Value.Path, true);
					}

					if (oFacetContent.Value && oFacetContent.Value.Apply && oFacetContent.Value.Apply.Name === "odata.concat") {
						oFacetContent.Value.Apply.Parameters.forEach(fnAnalyzeApplyFunctions);
					}

					if (oFacetContent.Action && oFacetContent.Action.Path) {
						fnGetDependents(oFacetContent.Action.Path);
					}

					if (oFacetContent.Target) {
						if (oFacetContent.Target.Path){
							fnGetDependents(oFacetContent.Target.Path);
						}
						if (oFacetContent.Target.AnnotationPath){
							fnGetDependents(oFacetContent.Target.AnnotationPath);
						}
					}

					if (oFacetContent.SemanticObject && oFacetContent.SemanticObject.Path) {
						fnGetDependents(oFacetContent.SemanticObject.Path);
					}

					if (oFacetContent.Url && oFacetContent.Url.Path) {
						fnGetDependents(oFacetContent.Url.Path);
					}

					if (oFacetContent.Url && oFacetContent.Url.Apply && oFacetContent.Url.Apply.Parameters) {
						oFacetContent.Url.Apply.Parameters.forEach(fnAnalyzeApplyFunctions);
					}


					if (oFacetContent.UrlContentType && oFacetContent.UrlContentType.Path) {
						fnGetDependents(oFacetContent.UrlContentType.Path);
					}

				}

				if (aFacetContent.name) {
					fnGetDependents(aFacetContent.name, true);
				}

				return aExpand;
			},

			isSelf: function (sPath) {
				if (sPath === undefined || (sPath && sPath.indexOf('@') === 0 && sPath.indexOf('/') === -1)) {
					return true;
				}
				return false;
			},
			// Needed for analytics fragments
			number: function (val) {
				if (!val) {
					return NaN;
				} else if (val.Decimal) {
					return +val.Decimal;
				} else if (val.Path) {
					return '{' + val.Path + '}';
				} else {
					return NaN;
				}
			},
			// Needed for analytics fragments
			formatColor: (function () {
				function formatVal(val) {
					if (!val) {
						return NaN;
					} else if (val.Decimal) {
						return val.Decimal;
					} else if (val.EnumMember) {
						return '\'' + val.EnumMember + '\'';
					} else if (val.Path) {
						return '${' + val.Path + '}';
					} else {
						return NaN;
					}
				}

				function formatCriticality(oDataPoint) {
					var criticality = oDataPoint.Criticality;

					return '{= ' + formatVal(criticality) + ' === \'UI.CriticalityType/Negative\' ? \'Error\' : ' + formatVal(criticality) + '=== \'UI.CriticalityType/Critical\' ? \'Critical\' : \'Good\'}';
				}

				function formatCriticalityCalculation(oDataPoint) {
					var value = formatVal(oDataPoint.Value);
					var oCriticalityCalc = oDataPoint.CriticalityCalculation;

					return '{= (' + value + ' < ' + formatVal(oCriticalityCalc.DeviationRangeLowValue) + ' || ' + value + ' > ' + formatVal(oCriticalityCalc.DeviationRangeHighValue) + ') ? \'Error\' : (' + value
					+ ' < ' + formatVal(oCriticalityCalc.ToleranceRangeLowValue) + ' || ' + value + ' > ' + formatVal(oCriticalityCalc.ToleranceRangeHighValue) + ') ? \'Critical\' : \'Good\'}';
				}

				return function (oDataPoint) {
					if (oDataPoint.Criticality) {
						return formatCriticality(oDataPoint);
					} else if (oDataPoint.CriticalityCalculation) {
						return formatCriticalityCalculation(oDataPoint);
					}
				};
			})(),

			_determineColumnIndex: function (oContext) {
				var sColumn = oContext.getPath();
				var iColumnIndex = Number(sColumn.slice(sColumn.lastIndexOf("/") + 1));
				var sLineItem = sColumn.slice(0, sColumn.lastIndexOf("/"));
				var oLineItem = oContext.getModel().getObject(sLineItem);
				var index = 0;
				for (var iRecord = 0; iRecord < iColumnIndex; iRecord++) {
					if ((oLineItem[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
							oLineItem[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") &&
							(!oLineItem[iRecord].Inline || oLineItem[iRecord].Inline.Bool === "false")) {
						//	iColumnIndex--;
						continue;
					} else {
						index++;
					}
				}
				return index;

			},

			/**
			 * Return a csv file to the ignoreFromPersonalisation properties of the table in SmartTable fragment
			 *
			 * @param {object} [oInterface] Contains interface object
			 * @param {object} [oEntity] Object containing all the lineItems
			 * @return {string} String containing comma separated values
			 * @private
			 */

			suppressP13NDuplicateColumns: function(oInterface, oEntity) {
				// To suppress the duplicate column rendered by SmartTable
				var sIgnoreFromP13N = "";
				var oDataField = {};
				var sCommaSeparator = ",";
				var oMetaModel = oInterface.getModel();
				// Loop to get all the Properties of Datafield
				for (var i = 0; i < oEntity.length; i++ ) {
					if (oEntity[i].RecordType === "com.sap.vocabularies.UI.v1.DataField") {
						if (oEntity[i].Value && oEntity[i].Value.Path) {
							var oDataProperty = oEntity[i].Value.Path;
							oDataField[oDataProperty] = true;
						}
					}
				}
				for (var i = 0; i < oEntity.length; i++) {
//					if (oEntity[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") {
//					if (oEntity[i].Value && oEntity[i].Value.Path) {
//					var oDataProperty = oEntity[i].Value.Path;
//					if (!oDataField[oDataProperty]) {
//					sIgnoreFromP13N = sIgnoreFromP13N + sCommaSeparator + oDataProperty;
//					}
//					}
//					} else 
					if (oEntity[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
						var oTargetLineItem = oMetaModel.getContext(oInterface.getPath() + "/" + i + "/Target");
						var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oTargetLineItem);
						var oDataFieldForAnnotation = oMetaModel.getObject(sResolvedPath);
						if (sResolvedPath.indexOf('com.sap.vocabularies.Communication.v1.Contact') >= 0) {
							if (oDataFieldForAnnotation && oDataFieldForAnnotation.fn && oDataFieldForAnnotation.fn.Path) {
								var oDataProperty = oDataFieldForAnnotation.fn.Path;
								if (!oDataField[oDataProperty]) {
									sIgnoreFromP13N = sIgnoreFromP13N + sCommaSeparator + oDataProperty;
								}
							}
						} else if (sResolvedPath.indexOf('com.sap.vocabularies.UI.v1.DataPoint') >= 0) {
							if (oDataFieldForAnnotation &&  oDataFieldForAnnotation.Value && oDataFieldForAnnotation.Value.Path) {
								var oDataProperty = oDataFieldForAnnotation.Value.Path;
								if (!oDataField[oDataProperty]) {
									sIgnoreFromP13N = sIgnoreFromP13N + sCommaSeparator + oDataProperty;
								}
							}
						}
					}
				}
				if (sIgnoreFromP13N.length > 0) {
					sIgnoreFromP13N = sIgnoreFromP13N.substring(1);
				}
				return sIgnoreFromP13N;
			},

			createP13NColumnForFilterAction: function (oEntityType) {
				//used by DataFieldForAction, DataFieldWithIntentBasedNavigation, DataFieldForIntentBasedNavigation
				var sColumnKey = "";
				var sFioriTemplatePrefix = "template";
				var sSeperator = "::";

				var index = 0;
				var lineItems;
				if(oEntityType["vui.bodc.NonResponsiveLineItem"]){
					lineItems = oEntityType["vui.bodc.NonResponsiveLineItem"];
				}else{
					lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}

				sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForAction" + sSeperator + "ADD_FILTER";
				var sP13N = '\\{"columnKey":"' + sColumnKey +  '", "columnIndex":"' + index + '", "actionButton":"true" \\}';
				return sP13N;
			},
			createP13NColumnForDetails: function (oEntityType) {
				//used by DataFieldForAction, DataFieldWithIntentBasedNavigation, DataFieldForIntentBasedNavigation
				var sColumnKey = "";
				var sFioriTemplatePrefix = "template";
				var sSeperator = "::";

				var index = 0;
				var lineItems;
				if(oEntityType["vui.bodc.NonResponsiveLineItem"]){
					lineItems = oEntityType["vui.bodc.NonResponsiveLineItem"];
				}else{
					lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}
				index++;
				sColumnKey = sFioriTemplatePrefix + sSeperator + "DSC" + sSeperator + "DETAILSBUTTON";
				var sP13N = '\\{"columnKey":"' + sColumnKey +  '", "columnIndex":"' + index + '", "detailsButton":"true" \\}';
				return sP13N;
			},
			createP13NColumnForAction: function (iContext, oDataField) {
				//used by DataFieldForAction, DataFieldWithIntentBasedNavigation, DataFieldForIntentBasedNavigation
				var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex( iContext );
				var sColumnKey = oAnnotationHelper.createP13NColumnKey(oDataField);
				if (oDataField && oDataField.Value && oDataField.Value.Path) {
					var sP13N = '\\{"columnKey":"' + sColumnKey + '", "leadingProperty":"' + oDataField.Value.Path + '", "columnIndex":"' + iColumnIndex;
					var oRestrictionModel = getAllRestrictions(iContext, oDataField.Value.Path);
					var bNotFilterable = oRestrictionModel.getFilterRestriction();
					var bNotSortable = oRestrictionModel.getSortRestriction();
					if (!bNotSortable) {
						sP13N += '", "sortProperty":"' + oDataField.Value.Path;
					}
					if (!bNotFilterable) {
						sP13N += '", "filterProperty":"' + oDataField.Value.Path;
					}
					sP13N += '", "actionButton":"true" \\}';
				} else {
					var sP13N = '\\{"columnKey":"' + sColumnKey +  '", "columnIndex":"' + iColumnIndex + '", "actionButton":"true" \\}';
				}
				return sP13N;
			},

			// For Personalization and ContactPopUp for contact column
			createP13NColumnForContactPopUp: function (oInterface, oContextSet, oDataField, oDataFieldTarget, sAnnotationPath) {
				var sP13N = "";
				var sNavigation = "";
				var oMetaModel = oInterface.getInterface(0).getModel();
				if (oMetaModel){
					var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
					if (oEntityType){
						sNavigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sAnnotationPath);
					}
				}
				// Make Column Key unique for contact in P13n.
				var sColumnKey = oAnnotationHelper.createP13NColumnKey(oDataField);
				if (oDataFieldTarget && oDataFieldTarget.fn && oDataFieldTarget.fn.Path) {
					if (sNavigation) {
						var oEndAssociationSet = oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigation);
						if (oEndAssociationSet && oEndAssociationSet.entitySet) {
							var oContextSet = oMetaModel.getODataEntitySet(oEndAssociationSet.entitySet);
						}
						var oRestrictionModel = getAllRestrictions(oContextSet, oDataFieldTarget.fn.Path);
						var bNotFilterable = oRestrictionModel.getFilterRestriction();
						var bNotSortable = oRestrictionModel.getSortRestriction();
						// For the expand property of Navigation, add navigation to the AdditionalProperties of P13N.
						sP13N = '\\{"columnKey":"' + sColumnKey +
						'", "leadingProperty":"' + sNavigation + '/' + oDataFieldTarget.fn.Path +
						'", "additionalProperty":"' + sNavigation;
						if (!bNotSortable) {
							sP13N += '", "sortProperty":"' + sNavigation + '/' + oDataFieldTarget.fn.Path;
						}
						if (!bNotFilterable) {
							sP13N += '", "filterProperty":"' + sNavigation + '/' + oDataFieldTarget.fn.Path;
						}
					} else {
						var oRestrictionModel = getAllRestrictions(oContextSet, oDataFieldTarget.fn.Path);
						var bNotFilterable = oRestrictionModel.getFilterRestriction();
						var bNotSortable = oRestrictionModel.getSortRestriction();
						sP13N = '\\{"columnKey":"' + sColumnKey +
						'", "leadingProperty":"' + oDataFieldTarget.fn.Path +
						'", "filterProperty":"' + oDataFieldTarget.fn.Path +
						'", "additionalProperty":"' + oDataFieldTarget.fn.Path;
						if (!bNotSortable) {
							sP13N += '", "sortProperty":"' + sNavigation + '/' + oDataFieldTarget.fn.Path;
						}
						if (!bNotFilterable) {
							sP13N += '", "filterProperty":"' + sNavigation + '/' + oDataFieldTarget.fn.Path;
						}
					}
				}
				sP13N += '", "navigationProperty":"' + sNavigation;
				// Determine column index
				var oContext = oInterface.getInterface(1);
				var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex( oContext );
				if (iColumnIndex) {
					sP13N += '", "columnIndex":"' + iColumnIndex;
				}
				sP13N += '" \\}'; // add terminator string again
				return sP13N;
			},

			createP13NColumnForIndicator: function (oInterface, oContextSet, oContextProp, oDataField, oDataFieldTarget, oDataFieldTargetValue, sAnnotationPath) {
				var sP13N = "";
				var sNavigation = "";
				var aAdditionalProperties = [];
				var oMetaModel = oInterface.getInterface(0).getModel();
				if (oMetaModel){
					var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
					if (oEntityType){
						sNavigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sAnnotationPath);
					}
				}
				var sColumnKey = oAnnotationHelper.createP13NColumnKey(oDataField);
				if (sNavigation) {
					sP13N = '\\{"columnKey":"' + sColumnKey + '", "leadingProperty":"' + sNavigation;
					sNavigation = sNavigation + "/";
				} else {
					sP13N = '\\{"columnKey":"' + sColumnKey;
				}
				if (oDataFieldTarget.Value && oDataFieldTarget.Value.Path) {
					aAdditionalProperties.push(sNavigation + oDataFieldTarget.Value.Path);
				}
				if (oDataFieldTarget.TargetValue && oDataFieldTarget.TargetValue.Path) {
					aAdditionalProperties.push(sNavigation + oDataFieldTarget.TargetValue.Path);
				}
				if (oDataFieldTarget.Criticality && oDataFieldTarget.Criticality.Path) {
					aAdditionalProperties.push(sNavigation + oDataFieldTarget.Criticality.Path);
				}
				if (aAdditionalProperties.length > 0) {
					var sAdditionalProperties = "";
					aAdditionalProperties.forEach(function (oProperty) {
						if (sAdditionalProperties) {
							sAdditionalProperties = sAdditionalProperties + ",";
						}
						sAdditionalProperties = sAdditionalProperties + oProperty;
					});
					sP13N += '", "additionalProperty":"' + sAdditionalProperties;
				}

				// Determine column index
				var oContext = oInterface.getInterface(2);
				var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex( oContext );
				if (iColumnIndex) {
					sP13N += '", "columnIndex":"' + iColumnIndex;
				}
				if (oDataFieldTarget && oDataFieldTarget.Value && oDataFieldTarget.Value.Path) {
					var oRestrictionModel = getAllRestrictions(oContextSet, oDataFieldTarget.Value.Path);
					var bNotFilterable = oRestrictionModel.getFilterRestriction();
					var bNotSortable = oRestrictionModel.getSortRestriction();
					if (!bNotSortable) {
						sP13N += '", "sortProperty":"' + oDataFieldTarget.Value.Path; // for Sort Property
					}
					if (!bNotFilterable) {
						sP13N += '", "filterProperty":"' + oDataFieldTarget.Value.Path; // for Filter Property
					}
				}
				sP13N += '" \\}'; // add terminator string again
				return sP13N;
			},
			createP13NColumnForChart: function (oInterface, oContextSet, oDataField, oDataFieldTarget, sAnnotationPath) {
				var sP13N = "", aAdditionalProperties = [], sNavigation = "";
				var oMetaModel = oInterface.getInterface(0).getModel();
				if (oMetaModel) {
					var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
					if (oEntityType){
						sNavigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sAnnotationPath);
					}
				}
				var sColumnKey = oAnnotationHelper.createP13NColumnKey(oDataField);
				if (sNavigation) {
					sP13N = '\\{"columnKey":"' + sColumnKey + '", "leadingProperty":"' + sNavigation;
					sNavigation = sNavigation + "/";
				} else {
					sP13N = '\\{"columnKey":"' + sColumnKey;
				}
				if (Array.isArray(oDataFieldTarget.Dimensions)) {
					oDataFieldTarget.Dimensions.forEach(function(oDimension){
						aAdditionalProperties.push(sNavigation + oDimension.PropertyPath);
					});
				}
				if (Array.isArray(oDataFieldTarget.Measures)) {
					oDataFieldTarget.Measures.forEach(function(oMeasure){
						aAdditionalProperties.push(sNavigation + oMeasure.PropertyPath);
					});
				}

				if (aAdditionalProperties.length > 0) {
					sP13N += '", "additionalProperty":"' + aAdditionalProperties.join();
				}

				var oContext = oInterface.getInterface(1);
				var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex(oContext);
				if (iColumnIndex) {
					sP13N += '", "columnIndex":"' + iColumnIndex;
				}
				sP13N += '" \\}';

				return sP13N;
			},

			createP13NColumnKey: function (oDataField, oContextProp) {
				var sColumnKey = "";
				var sFioriTemplatePrefix = "template";
				var sSeperator = "::";
				if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField"){
					/*
				if (oContextProp && oAnnotationHelper.isImageUrl(oContextProp)){
					//if the columnKey is defined like that, smart table renders an extra picture since it doesn't find the columnKey with only the oDataField.Value.Path
					sColumnKey = sFioriTemplatePrefix + sSeperator + "DataField" + sSeperator + "IsImageURL" + sSeperator + oDataField.Value.Path;
				} else {*/
					//compatible with Smart Table
					/* e.g.
					 * DataField "ProductCategory", "to_StockAvailability/StockAvailability"
					 */
					sColumnKey = oDataField.Value.Path;
					//}
				}else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation"
					|| oDataField.RecordType === "vui.bodc.DataFieldWithDrilldownNavigation" 
					|| oDataField.RecordType === "vui.bodc.Popover"
					|| oDataField.RecordType === "vui.bodc.Hyperlink"){
					sColumnKey = oDataField.Value.Path; 
//					}else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation"){
//					sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldWithIntentBasedNavigation" + sSeperator + oDataField.SemanticObject.String + sSeperator + oDataField.Action.String + sSeperator + oDataField.Value.Path;
				} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath"){
					sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldWithNavigationPath" + sSeperator + oDataField.Value.Path;
				} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation"){
					sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForIntentBasedNavigation" + sSeperator + oDataField.SemanticObject.String + sSeperator + oDataField.Action.String;
				} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction"){
					sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForAction" + sSeperator + oDataField.Action.String;
				} else if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation"){
					if (oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.Communication.v1.Contact') >= 0 ||
							oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.DataPoint') >= 0		    ||
							oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.FieldGroup') >= 0		    ||
							oDataField.Target.AnnotationPath.indexOf('@com.sap.vocabularies.UI.v1.Chart') >= 0 ){
						sColumnKey = sFioriTemplatePrefix + sSeperator + "DataFieldForAnnotation" + sSeperator + oDataField.Target.AnnotationPath;
						//since DataFieldForAnnotation can contain an @ and this is not working with SmartTable.prototype._addTablePersonalisationToToolbar, it is removed
						sColumnKey = sColumnKey.replace('@', '');
					}
				}
				return sColumnKey;
			},

			createP13NforStackColumn: function (oContextSet, oDataField) {
				var sP13N = "", aAdditionalProperties = [], sNavigation = "";
				if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.CollectionField") {
					if (oDataField.ID.String) {
						var sColumnKey = oDataField.ID.String;
						sP13N = '\\{"columnKey":"' + sColumnKey;
					}
					if(oDataField && oDataField.Position && oDataField.Position.Int ){
						var position = oDataField.Position.Int - 1;
						sP13N += '", "columnIndex":"' + position;
					}
//					else {
//					var oContext = oInterface.getInterface(2);
//					var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex(oContext);
//					if (iColumnIndex >= 0) {
//					sP13N += '", "columnIndex":"' + iColumnIndex;
//					}
//					}
				}
				return sP13N + '" \\}';
			},

			getSortProperty: function (oInterface, oContextSet, oContextProp, oDataField) {
				var sNavigation = "";
				if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField" 
					|| oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation" 
						|| oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
					if (oDataField.Value.Path) {

						var oMetaModel = oInterface.getInterface(0).getModel();
						if (oMetaModel){
							var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
							if (oEntityType){
								sNavigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Value.Path);
								if (sNavigation){
									sNavigation = sNavigation + "/";
								}
							}
						}
					}
				}

				var oRestrictionModel = getAllRestrictions(oContextSet, oContextProp.name);
				var bNotFilterable = oRestrictionModel.getFilterRestriction();
				var bNotSortable = oRestrictionModel.getSortRestriction();
				if (!bNotSortable) {
					if (sNavigation) {
						return "{parts: [{value: '" + sNavigation + oContextProp.name + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getColumnSortProperty'}";
//						return sNavigation + oContextProp.name;
					} else {
						return "{parts: [{value: '" + oContextProp.name + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getColumnSortProperty'}";
//						return + oContextProp.name;
					}
				}
				return "";
			},

			getColumnSortProperty : function(sortProperty){
				return sortProperty;
			},

			getFilterProperty: function (oContextSet, oContextProp, oDataField) {
				if(oDataField.Value && oDataField.Value.Path && oDataField.Value.Path.indexOf("/") != -1)
					return "";

				var oRestrictionModel = getAllRestrictions(oContextSet, oContextProp.name);
				var bNotFilterable = oRestrictionModel.getFilterRestriction();

				if (!bNotFilterable) {
					return oContextProp.name;
				}
				return "";
			},

			getDemandPopin: function(oContextProp, oDataField){
				if(oDataField.Value && oDataField.Value.Path){
					if(oDataField.Value.Path.indexOf('/') != -1)
						return true;
				}
				return false;
			},

			createP13N: function (oInterface, oContextSet, oContextProp, oDataField ,oDataFieldTarget, oDataFieldTargetValue) {
				var sP13N = "", aAdditionalProperties = [], sNavigation = "";
				var navigationProperties = [];
				if (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataField" || 
						oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation" ||
						oDataField.RecordType === "vui.bodc.DataFieldWithDrilldownNavigation" ||
						oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation" ||
						oDataField.RecordType === "vui.bodc.Hyperlink" ||
						oDataField.RecordType === "vui.bodc.Popover" ||
						oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
					if (oDataField.Value.Path) {
						var sColumnKey = oAnnotationHelper.createP13NColumnKey(oDataField, oContextProp);
						sP13N = '\\{"columnKey":"' + sColumnKey + '", "leadingProperty":"' + oDataField.Value.Path;
						// get Navigation Prefix
						var oMetaModel = oInterface.getInterface(0).getModel();
						if (oMetaModel){
							var oEntityType = oMetaModel.getODataEntityType(oContextSet.entityType);
							if (oEntityType){
								if (oContextProp["com.sap.vocabularies.Common.v1.Text"] && oContextProp["com.sap.vocabularies.Common.v1.Text"].Path) {
									var sTextArrangement = oAnnotationHelper.getTextArrangement(oEntityType, oDataField);
									if (sTextArrangement) {
										sP13N += '", "description":"' + oContextProp["com.sap.vocabularies.Common.v1.Text"].Path + '", "displayBehaviour":"' + sTextArrangement;
									}
								}
								sNavigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oDataField.Value.Path);
								if (sNavigation){
									navigationProperties.push(sNavigation);
//									sP13N += '", "navigationProperty":"' + sNavigation;
									sNavigation = sNavigation + "/";
								}else{
									if (oContextProp["com.sap.vocabularies.Common.v1.Text"] && oContextProp["com.sap.vocabularies.Common.v1.Text"].Path) {
										var navigation = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oContextProp["com.sap.vocabularies.Common.v1.Text"].Path);
										if (navigation){
											navigationProperties.push(navigation);
										}
									}
								}

							}
						}
					} else if (oDataField.Value.Apply && oDataField.Value.Apply.Name === "odata.concat") {
						oDataField.Value.Apply.Parameters.forEach(function (oParameter) {
							if (oParameter.Type === "Path") {
								if (!sP13N) {
									sP13N = '\\{"columnKey":"' + oParameter.Value + '", "leadingProperty":"' + oParameter.Value;
								} else {
									aAdditionalProperties.push(oParameter.Value);
								}
							}
						});
					}
					if ((oContextProp.type === "Edm.DateTime") && (oContextProp["sap:display-format"] === "Date")) {
						sP13N += '", "type":"date';
					}
					if (oDataField.Criticality && oDataField.Criticality.Path) {
						aAdditionalProperties.push(oDataField.Criticality.Path);
					}
					if (oContextProp["com.sap.vocabularies.Common.v1.Text"] && oContextProp["com.sap.vocabularies.Common.v1.Text"].Path) {
						aAdditionalProperties.push(sNavigation + oContextProp["com.sap.vocabularies.Common.v1.Text"].Path);
					}
					if (oContextProp["Org.OData.Measures.V1.ISOCurrency"] && oContextProp["Org.OData.Measures.V1.ISOCurrency"].Path) {
						aAdditionalProperties.push(sNavigation + oContextProp["Org.OData.Measures.V1.ISOCurrency"].Path);

						var oUnitField = _.findWhere(oEntityType.property , { name : oContextProp["Org.OData.Measures.V1.ISOCurrency"].Path });
						if (oUnitField["com.sap.vocabularies.Common.v1.Text"] && oUnitField["com.sap.vocabularies.Common.v1.Text"].Path) {
							var navigation1 = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oUnitField["com.sap.vocabularies.Common.v1.Text"].Path);
							if (navigation1){
								navigationProperties.push(navigation1);
							}
						}
					}
					if (oContextProp["Org.OData.Measures.V1.Unit"] && oContextProp["Org.OData.Measures.V1.Unit"].Path) {
						aAdditionalProperties.push(sNavigation + oContextProp["Org.OData.Measures.V1.Unit"].Path);

						var oUnitField = _.findWhere(oEntityType.property , { name : oContextProp["Org.OData.Measures.V1.Unit"].Path });
						if (oUnitField["com.sap.vocabularies.Common.v1.Text"] && oUnitField["com.sap.vocabularies.Common.v1.Text"].Path) {
							var navigation1 = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, oUnitField["com.sap.vocabularies.Common.v1.Text"].Path);
							if (navigation1){
								navigationProperties.push(navigation1);
							}
						}
					}
					if (oContextProp["com.sap.vocabularies.Common.v1.FieldControl"] && oContextProp["com.sap.vocabularies.Common.v1.FieldControl"].Path) {
						aAdditionalProperties.push(sNavigation + oContextProp["com.sap.vocabularies.Common.v1.FieldControl"].Path);
					}

					if ((oDataField["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && oDataField.Url && oDataField.Url.Apply && oDataField.Url.Apply.Parameters) {
						oDataField.Url.Apply.Parameters.forEach(function (oParameter) {
							if (oParameter.Type === "LabeledElement") {
								aAdditionalProperties.push(oParameter.Value.Path);
							}
						});
					}
					if ((oDataField["RecordType"] === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") && oDataField.Url && oDataField.Url.Path) {
						aAdditionalProperties.push(oDataField.Url.Path);
					}

					if(navigationProperties.length > 0){
						sP13N += '", "navigationProperty":"' + navigationProperties.toString();
					}

					if (aAdditionalProperties.length > 0) {
						var sAdditionalProperties = "";
						aAdditionalProperties.forEach(function (oProperty) {
							if (sAdditionalProperties) {
								sAdditionalProperties = sAdditionalProperties + ",";
							}
							sAdditionalProperties = sAdditionalProperties + oProperty;
						});
						sP13N += '", "additionalProperty":"' + sAdditionalProperties;
					}
					var oRestrictionModel = getAllRestrictions(oContextSet, oContextProp.name);
					var bNotFilterable = oRestrictionModel.getFilterRestriction();
					var bNotSortable = oRestrictionModel.getSortRestriction();
					if (!bNotSortable) {
						if (sNavigation) {
							sP13N += '", "sortProperty":"' + sNavigation + oContextProp.name;
						} else {
							sP13N += '", "sortProperty":"' + oContextProp.name;
						}
					}
					if (!bNotFilterable) {
						sP13N += '", "filterProperty":"' + oContextProp.name;
					}
					if(oDataField && oDataField.Position && oDataField.Position.Int ){
						var position = oDataField.Position.Int - 1;
						sP13N += '", "columnIndex":"' + position;
					}else {
						var oContext = oInterface.getInterface(2);
						var iColumnIndex = zvui.work.controller.AnnotationHelper._determineColumnIndex(oContext);
						if (iColumnIndex >= 0) {
							sP13N += '", "columnIndex":"' + iColumnIndex;
						}
					}
				}
				return sP13N + '" \\}';
			},

			getEditStatusText : function(oEntitySet){
				return "{parts: [{path: 'edtst'}], formatter: 'zvui.work.controller.AnnotationHelper.getEditStatusFieldText'}"
			},

			getEditStatusIcon : function(oEntitySet){
				return "{parts: [{path: 'edtst'}], formatter: 'zvui.work.controller.AnnotationHelper.getEditStatusFieldIcon'}"
			},

			getEditStatusFieldText : function(edtst){
				var oResBundle = this.getModel("i18n").getResourceBundle();
				if(edtst == "2")
					return oResBundle.getText("LOCKED");
				return "";
			},

			getEditStatusFieldIcon : function(edtst){
				if(edtst == "2")
					return "sap-icon://private";
				return "";
			},

			hasActions: function (Par) {
				//Adding Inline check as selection mode should be enabled if DataFieldForAction and DataFieldForIntentBasedNavigation are not inline(in line item) - BCP 1770035232, 1770097243
				for (var i = 0; i < Par.length; i++) {
					if ((!Par[i].Inline || Par[i].Inline.Bool !== "true") && (Par[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || (Par[i].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" && Par[i].RequiresContext && Par[i].RequiresContext.Bool === "true" ))) {
						return true;
					}
				}
				return false;
			},
			hasCustomActions: function(oRouteConfig, sEntitySet, oManifestExt, oFacet) {
				if (sEntitySet && oManifestExt) {
					if (oFacet) {
						// helper was called from facet (i.e. Object Page table)
						if (oManifestExt[sEntitySet]) {
							var oManifestExtEntitySet = oManifestExt[sEntitySet];
							if (oManifestExtEntitySet.EntitySet === sEntitySet) {
								// helper was called from fragment (i.e. SmartTable)
								var sFacetId = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
								if (!oManifestExtEntitySet.Sections) {
									return false;
								}
								var oSection = oManifestExtEntitySet.Sections[sFacetId];
								if (oSection && oSection.id === sFacetId && oSection.Actions) {
									for (var i in oSection.Actions) {
										if (oSection.Actions[i].requiresSelection !== false) {
											return true;
										}
									}
								}
							}
						}
					} else {
						// helper was called from ListReport or AnalyticalListPage
						if (oManifestExt["sap.suite.ui.generic.template.ListReport.view.ListReport"]) {
							oManifestExt = oManifestExt["sap.suite.ui.generic.template.ListReport.view.ListReport"]["sap.ui.generic.app"];
						} else if (oManifestExt["sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage"]) {
							oManifestExt = oManifestExt["sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage"]["sap.ui.generic.app"];
						}
						if (oManifestExt && oManifestExt[sEntitySet]) {
							var oManifestExtEntitySet = oManifestExt[sEntitySet];
							if (oManifestExtEntitySet.EntitySet === sEntitySet) {
								if (oManifestExtEntitySet.Actions) {
									for (var i in oManifestExtEntitySet.Actions) {
										if (oManifestExtEntitySet.Actions[i].requiresSelection !== false) {
											return true;
										}
									}
								}
							}
						}
					}
				}
				return false;
			},

			// Determine selection mode for tables
			getMultiSelectForTable: function (oFacet,oSections,bGlobalMultiSelect) {
				var oSettings = oSections && oSections[zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet)];
				var bMultiSelectForTable = (oSettings && oSettings.multiSelect);
				if (bMultiSelectForTable == true || (bGlobalMultiSelect == true && bMultiSelectForTable != false))	{
					return true;
				} else {
					return false;
				}
			},
			// Determine selection mode of analytical table
			getSelectionModeAnalyticalTable: function(aEntities, sRootEntitySet, oManifestExt, oFacet, oSections, oEntitySet, oRouteConfig, bIsDraftEnabled, bGlobalMultiSelect) {
				//Check for selection mode of the table
				var bMultiSelect = zvui.work.controller.AnnotationHelper.getMultiSelectForTable(oFacet,oSections,bGlobalMultiSelect);
				if ((zvui.work.controller.AnnotationHelper.hasActions(aEntities) || zvui.work.controller.AnnotationHelper.hasCustomActions(oRouteConfig, sRootEntitySet, oManifestExt, oFacet))){
					if (bMultiSelect){
						return "MultiToggle";
					} else {
						return "Single";
					}
				}
				var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
				if (bIsDraftEnabled){
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= ${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= ${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				} else {
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= !${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= !${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				}
				return "None";
			},
			// Determine selection mode of grid table
			getSelectionModeGridTable: function(aEntities, sRootEntitySet, oManifestExt, oFacet, oSections, oEntitySet, oRouteConfig, bIsDraftEnabled, bGlobalMultiSelect) {
				//Check for selection mode of the table
				var bMultiSelect = zvui.work.controller.AnnotationHelper.getMultiSelectForTable(oFacet,oSections,bGlobalMultiSelect);
				if ((zvui.work.controller.AnnotationHelper.hasActions(aEntities) || zvui.work.controller.AnnotationHelper.hasCustomActions(oRouteConfig, sRootEntitySet, oManifestExt, oFacet))){
					if (bMultiSelect) {
						return "MultiToggle";
					} else {
						return "Single";
					}
				}
				var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
				if (bIsDraftEnabled){
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= ${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= ${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				} else {
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= !${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= !${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				}
				return "None";
			},
			// Determine selection mode of Tree table
			getSelectionModeTreeTable: function(aEntities, sRootEntitySet, oManifestExt, oFacet, oSections, oEntitySet, oRouteConfig, bIsDraftEnabled, bGlobalMultiSelect) {
				//Check for selection mode of the table
				var bMultiSelect = zvui.work.controller.AnnotationHelper.getMultiSelectForTable(oFacet,oSections,bGlobalMultiSelect);
				if ((zvui.work.controller.AnnotationHelper.hasActions(aEntities) || zvui.work.controller.AnnotationHelper.hasCustomActions(oRouteConfig, sRootEntitySet, oManifestExt, oFacet))){
					if (bMultiSelect) {
						return "MultiToggle";
					} else {
						return "Single";
					}
				}
				var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
				if (bIsDraftEnabled){
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= ${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= ${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				} else {
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= !${ui>/editable} ? 'MultiToggle' : 'None' }";
						} else {
							return "{= !${ui>/editable} ? 'Single' : 'None' }";
						}
					}
				}
				return "None";
			},
			// Determine selection mode of responsive table
			getSelectionModeResponsiveTable: function(aEntities, sRootEntitySet, oManifestExt, oFacet, oSections, oEntitySet, oRouteConfig, bIsDraftEnabled, bGlobalMultiSelect) {
				//Check for selection mode of the table
				var bMultiSelect = zvui.work.controller.AnnotationHelper.getMultiSelectForTable(oFacet,oSections,bGlobalMultiSelect);
				if ((zvui.work.controller.AnnotationHelper.hasActions(aEntities) || zvui.work.controller.AnnotationHelper.hasCustomActions(oRouteConfig, sRootEntitySet, oManifestExt, oFacet))){
					if (bMultiSelect){
						return "MultiSelect";
					} else {
						return "SingleSelectLeft";
					}
				}
				var oDeleteRestrictions = oEntitySet["Org.OData.Capabilities.V1.DeleteRestrictions"];
				if (bIsDraftEnabled){
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= ${ui>/editable} ? 'MultiSelect' : 'None' }";
						} else {
							return "{= ${ui>/editable} ? 'SingleSelectLeft' : 'None' }";
						}
					}
				} else {
					if ((oDeleteRestrictions && oDeleteRestrictions.Deletable && ((oDeleteRestrictions.Deletable.Bool && oDeleteRestrictions.Deletable.Bool !== 'false') || oDeleteRestrictions.Deletable.Path)) || !oDeleteRestrictions){
						if (bMultiSelect){
							return "{= !${ui>/editable} ? 'MultiSelect' : 'None' }";
						} else {
							return "{= !${ui>/editable} ? 'SingleSelectLeft' : 'None' }";
						}
					}
				}
				return "None";
			},

			getSortOrder: function (Par) {
				var str = '';
				for (var i = 0; i < Par.length; i++) {
					if (!str) {
						str = Par[i].Property.PropertyPath;
					} else {
						str = str + ', ' + Par[i].Property.PropertyPath;
					}
					if (Par[i].Descending) {
						str = str + ' ' + Par[i].Descending.Bool;
					}
				}
				return str;
			},
			replaceSpecialCharsInId: function (sId) {
				if (sId.indexOf(" ") >= 0) {
					Log.error("Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there.");
				}
				return sId.replace(/@/g, "").replace(/\//g, "::").replace(/#/g, "::");
			},
			getStableIdPartFromDataField: function (oDataField) {
				var sPathConcat = "", sIdPart = "";
				if (oDataField.RecordType && oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
					return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.String);
				}else if(oDataField.RecordType && ( oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") ){
					return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Value.Path);
				}else if (oDataField.RecordType && (oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" || oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation")) {
					if (oDataField.SemanticObject.String) {
						sIdPart = zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.SemanticObject.String);
					} else if (oDataField.SemanticObject.Path) {
						sIdPart = zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.SemanticObject.Path);
					}
					if (oDataField.Action && oDataField.Action.String) {
						sIdPart = sIdPart + "::" + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.String);
					} else if (oDataField.Action && oDataField.Action.Path) {
						sIdPart = sIdPart + "::" + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Action.Path);
					}
					return sIdPart;
				} else if (oDataField.RecordType && oDataField.RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
					return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Target.AnnotationPath);
				} else if (oDataField.Value && oDataField.Value.Path) {
					return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Value.Path);
				} else if (oDataField.Value && oDataField.Value.Apply && oDataField.Value.Apply.Name === "odata.concat") {
					for (var i = 0; i < oDataField.Value.Apply.Parameters.length; i++) {
						if (oDataField.Value.Apply.Parameters[i].Type === "Path") {
							if (sPathConcat) {
								sPathConcat = sPathConcat + "::";
							}
							sPathConcat = sPathConcat + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataField.Value.Apply.Parameters[i].Value);
						}
					}
					return sPathConcat;
				} else {
					// In case of a string or unknown property
					Log.error("Annotation Helper: Unable to create a stable ID. Please check the annotations.");
				}
			},
			getStableIdPartFromDataPoint: function (oDataPoint) {
				var sPathConcat = "";
				if (oDataPoint.Value && oDataPoint.Value.Path) {
					return zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataPoint.Value.Path);
				} else if (oDataPoint.Value && oDataPoint.Value.Apply && oDataPoint.Value.Apply.Name === "odata.concat") {
					for (var i = 0; i < oDataPoint.Value.Apply.Parameters.length; i++) {
						if (oDataPoint.Value.Apply.Parameters[i].Type === "Path") {
							if (sPathConcat) {
								sPathConcat = sPathConcat + "::";
							}
							sPathConcat = sPathConcat + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oDataPoint.Value.Apply.Parameters[i].Value);
						}
					}
					return sPathConcat;
				} else {
					// In case of a string or unknown property
					Log.error("Annotation Helper: Unable to create stable ID derived from annotations.");
				}
			},
			getStableIdPartFromEntitySet: function (oEntitySet) {
				var sHeaderFacetPrefix = "";
				if(oEntitySet){
					sHeaderFacetPrefix = oEntitySet.name;
				}
				if (typeof this.getContext === "function" && this.getContext() && this.getContext().getPath() && this.getContext().getPath().indexOf("com.sap.vocabularies.UI.v1.HeaderFacets") >= 0) {
					sHeaderFacetPrefix = sHeaderFacetPrefix + "headerEditable::";
				}
				return sHeaderFacetPrefix;
//				if (oFacet.RecordType && oFacet.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
//				if (oFacet.ID && oFacet.ID.String) {
//				return sHeaderFacetPrefix + oFacet.ID.String;
//				} else {
//				// If the ID is missing a random value is returned because a duplicate ID error will be thrown as soon as there is
//				// more than one form on the UI.
//				Log.error("Annotation Helper: Unable to create a stable ID. You have to set an ID at all collection facets.");
//				return Math.floor((Math.random() * 99999) + 1).toString();
//				}
//				} else if (oFacet.RecordType && oFacet.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
//				if (oFacet.ID && oFacet.ID.String) {
//				return sHeaderFacetPrefix + oFacet.ID.String;
//				} else {
//				return sHeaderFacetPrefix + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oFacet.Target.AnnotationPath);
//				}
//				} else {
//				Log.error("Annotation Helper: Unable to create a stable ID. Please check the facet annotations.");
//				return Math.floor((Math.random() * 99999) + 1).toString();
//				}
			},
			getStableIdPartFromFacet: function (oFacet,oEntitySet) {
				var sHeaderFacetPrefix = "", sHeaderFacetPostfix = "";
				if(oEntitySet){
					sHeaderFacetPrefix = oEntitySet.name;
				}
				if(window.workspaceType){
					sHeaderFacetPostfix += window.workspaceType;
				}	
				
				if(window.fromPopoverSection){
					sHeaderFacetPostfix += Date.now();
				}
				
				if (typeof this.getContext === "function" && this.getContext() && this.getContext().getPath() && this.getContext().getPath().indexOf("com.sap.vocabularies.UI.v1.HeaderFacets") >= 0) {
					sHeaderFacetPrefix = sHeaderFacetPrefix + "headerEditable::";
				}
				if (oFacet.RecordType && oFacet.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
					if (oFacet.ID && oFacet.ID.String) {
						return sHeaderFacetPrefix + oFacet.ID.String + "::" + sHeaderFacetPostfix;
					} else {
						// If the ID is missing a random value is returned because a duplicate ID error will be thrown as soon as there is
						// more than one form on the UI.
						Log.error("Annotation Helper: Unable to create a stable ID. You have to set an ID at all collection facets.");
						return Math.floor((Math.random() * 99999) + 1).toString() + "::" + sHeaderFacetPostfix;
					}
				} else if (oFacet.RecordType && oFacet.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
					if (oFacet.ID && oFacet.ID.String) {
						return sHeaderFacetPrefix + oFacet.ID.String + "::" + sHeaderFacetPostfix;
					} else {
						return sHeaderFacetPrefix + zvui.work.controller.AnnotationHelper.replaceSpecialCharsInId(oFacet.Target.AnnotationPath) + "::" + sHeaderFacetPostfix;
					}
				} else {
					Log.error("Annotation Helper: Unable to create a stable ID. Please check the facet annotations.");
					return Math.floor((Math.random() * 99999) + 1).toString() + "::" + sHeaderFacetPostfix;
				}
			},
			getVisibilityForExtensionPointReplaceHeader: function (sEntitySet, oManifestExtend) {
				var sExtensionPointId = "ReplaceHeaderExtensionFacet|" + sEntitySet;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointReplaceHeaderExists: function (sEntitySet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "ReplaceHeaderExtensionFacet|" + sEntitySet;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointNoImage: function (sEntitySet, oManifestExtend) {
				var sExtensionPointId = "NoImageExtensionFacet|" + sEntitySet;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointNoImageExists: function (sEntitySet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "NoImageExtensionFacet|" + sEntitySet;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointAfterImage: function (sEntitySet, oManifestExtend) {
				var sExtensionPointId = "AfterImageExtensionFacet|" + sEntitySet;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointAfterImageExists: function (sEntitySet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "AfterImageExtensionFacet|" + sEntitySet;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointBeforeSimpleHeaderFacet: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				var sSecondHalfIdPart;
				var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
				} else {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
				}
				var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
				var sExtensionPointId = "BeforeSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointBeforeSimpleHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				if (oManifestExtend) {
					var sSecondHalfIdPart;
					var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
					} else {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
					}
					var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
					var sExtensionPointId = "BeforeSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointReplaceSimpleHeaderFacet: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				var sSecondHalfIdPart;
				var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
				} else {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
				}
				var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
				var sExtensionPointId = "ReplaceSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointReplaceSimpleHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				if (oManifestExtend) {
					var sSecondHalfIdPart;
					var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
					} else {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
					}
					var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
					var sExtensionPointId = "ReplaceSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointAfterSimpleHeaderFacet: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				var sSecondHalfIdPart;
				var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
				} else {
					sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
				}
				var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
				var sExtensionPointId = "AfterSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointAfterSimpleHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend, oDataField) {
				if (oManifestExtend) {
					var sSecondHalfIdPart;
					var sFirstHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					if (oFacet.Target.AnnotationPath.indexOf("DataPoint") > 0) {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataField);
					} else {
						sSecondHalfIdPart = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDataField);
					}
					var sId = sFirstHalfIdPart + "::" + sSecondHalfIdPart;
					var sExtensionPointId = "AfterSimpleHeaderFacet|" + sEntitySet + "|headerEditable::" + sId;
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointBeforeHeaderFacet: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "BeforeHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointBeforeHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "BeforeHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointReplaceHeaderFacet: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "ReplaceHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointReplaceHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "ReplaceHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			getVisibilityForExtensionPointAfterHeaderFacet: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "AfterHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['bVisibleOnEdit'] === false) {
					return false;
				}
				return true;
			},
			extensionPointAfterHeaderFacetExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "AfterHeaderFacet|" + sEntitySet + "|headerEditable::" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			extensionPointBeforeHeaderDataPointExists: function (sEntitySet, oDataPoint, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "BeforeHeaderDataPoint|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataPoint);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			extensionPointReplaceHeaderDataPointExists: function (sEntitySet, oDataPoint, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "ReplaceHeaderDataPoint|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataPoint);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			extensionPointAfterHeaderDataPointExists: function (sEntitySet, oDataPoint, oManifestExtend) {
				if (oManifestExtend) {
					var sExtensionPointId = "AfterHeaderDataPoint|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromDataPoint(oDataPoint);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			/**
			 * This function return manifest view extensions with "key" property in "sap.ui.generic.app" object if manifest entry contains 3 pipes for facet extensions
			 * @param {object} oContext
			 * @returns {string} returns manifest view extensions object path
			 */
			getObjectPageExtensions: function(oContext){
				var oManifest = oContext.getObject();
				for (var key in oManifest){
					if (key.split('|').length === 4 && !(oManifest[key]['sap.ui.generic.app'] && oManifest[key]['sap.ui.generic.app']['key'])){
						jQuery.extend(true, oManifest[key],{'sap.ui.generic.app':{'key':key.split('|')[3]}});
					}
				}
				oContext.getModel().setProperty("/manifestViewExtensions",oManifest);
				return "/manifestViewExtensions";
			},
			/**
			 * This function checks if the oFacet has BeforeFacet extension(s)
			 * @param {string} sEntitySet
			 * @param {object} oFacet
			 * @param {object} oManifestExtend
			 * @returns {boolean} true if oFacet has before facet extension(s)
			 */
			extensionPointBeforeFacetExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "BeforeFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					var aExtensions = Object.keys(oManifestExtend);
					for (var key in aExtensions){
						if (aExtensions[key].indexOf(sExtensionPointId) > -1){
							return true;
						}
					}
				}
				return false;
			},
			/**
			 * This function stores the extension keys as array
			 * @param {object} oContext
			 * @returns {string} path to the stored extensions as array
			 */
			getExtensions: function (oContext){
				var oManifest = oContext.getObject();
				var aManifestWithKeys = Object.keys(oManifest);
				var oModel = oContext.getModel();
				oModel.setProperty("/extensionKeys",aManifestWithKeys);
				return "/extensionKeys";
			},
			/**
			 * This function checks whether sManifestkey is the before facet extension for oFacet
			 * @param {string} sManifestKey
			 * @param {string} sExtensionName
			 * @param {string} sEntitySet
			 * @param {object} oFacet
			 * @returns {boolean} true if sManifestkey is the before facet extension for oFacet
			 */
			isCurrentManifestEntryForBeforeFacet: function(sManifestKey, sEntitySet, oFacet){
				if (sManifestKey){
					var sExtensionPointId =  "BeforeFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return sManifestKey.indexOf(sExtensionPointId) > -1;
				}
				return false;
			},
			/**
			 * This function checks whether sManifestkey is the after facet extension for oFacet
			 * @param {string} sManifestKey
			 * @param {string} sExtensionName
			 * @param {string} sEntitySet
			 * @param {object} oFacet
			 * @returns {boolean} true if sManifestkey is the after facet extension for oFacet
			 */
			isCurrentManifestEntryForAfterFacet: function(sManifestKey, sEntitySet, oFacet){
				if (sManifestKey){
					var sExtensionPointId =  "AfterFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return sManifestKey.indexOf(sExtensionPointId) > -1;
				}
				return false;
			},
			/**
			 * This function checks if the sManifest key has three components which is the format for legacy facet extensions
			 * @param {string} sManifestKey
			 * @returns {boolean} returns true if manifestkey has 3 components separated by '|'
			 */
			isManifestKeyLegacy: function(sManifestKey){
				if (sManifestKey){
					return (sManifestKey.split('|').length === 3);
				}
				return false;
			},
			/**
			 * This function checks if the oFacet has AfterFacet extension(s)
			 * @param {string} sEntitySet
			 * @param {object} oFacet
			 * @param {object} oManifestExtend
			 * @returns {boolean} true if oFacet has after facet extension(s)
			 */
			extensionPointAfterFacetExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "AfterFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					var aExtensions = Object.keys(oManifestExtend);
					for (var key in aExtensions){
						if (aExtensions[key].indexOf(sExtensionPointId) > -1){
							return true;
						}
					}
				}
				return false;
			},
			extensionPointBeforeSubSectionExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "BeforeSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			extensionPointAfterSubSectionExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "AfterSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			extensionPointReplaceSubSectionExists: function (sEntitySet, oFacet, oManifestExtend) {
				if (oManifestExtend){
					var sExtensionPointId = "ReplaceSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
					return oManifestExtend[sExtensionPointId];
				}
				return false;
			},
			/**
			 * This function gets the facet title for extension sManifestKey
			 * @param {string} sManifestKey
			 * @param {object} oManifestExtend
			 * @returns {string} returns title for extension sManifest
			 */
			getExtensionPointFacetTitle: function (sManifestKey, oManifestExtend) {
				var oExtension = oManifestExtend[sManifestKey];
				if (oExtension && oExtension['sap.ui.generic.app'] && oExtension['sap.ui.generic.app'].title) {
					return oExtension['sap.ui.generic.app'].title;
				}
			},
			getExtensionPointAfterFacetTitle: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "AfterFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['sap.ui.generic.app'] && oExtension['sap.ui.generic.app'].title) {
					return oExtension['sap.ui.generic.app'].title;
				}
			},
			getExtensionPointBeforeSubSectionTitle: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "BeforeSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['sap.ui.generic.app'] && oExtension['sap.ui.generic.app'].title) {
					return oExtension['sap.ui.generic.app'].title;
				}
			},
			getExtensionPointAfterSubSectionTitle: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "AfterSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['sap.ui.generic.app'] && oExtension['sap.ui.generic.app'].title) {
					return oExtension['sap.ui.generic.app'].title;
				}
			},
			getExtensionPointReplaceSubSectionTitle: function (sEntitySet, oFacet, oManifestExtend) {
				var sExtensionPointId = "ReplaceSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				var oExtension = oManifestExtend[sExtensionPointId];
				if (oExtension && oExtension['sap.ui.generic.app'] && oExtension['sap.ui.generic.app'].title) {
					return oExtension['sap.ui.generic.app'].title;
				}
			},
			isExtensionPointBeforeSubSectionLazyLoadingEnabled: function (sEntitySet, oFacet, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(
						"BeforeSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet),
						oManifestExtend);
			},
			isExtensionPointAfterSubSectionLazyLoadingEnabled: function (sEntitySet, oFacet, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(
						"AfterSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet),
						oManifestExtend);
			},
			isExtensionPointReplaceSubSectionLazyLoadingEnabled: function (sEntitySet, oFacet, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(
						"ReplaceSubSection|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet),
						oManifestExtend);
			},
			/**
			 * This function checks whether extension sManifest is lazy loading enabled
			 * @param {string} sManifestKey
			 * @param {object} oManifestExtend
			 * @returns {boolean} true if sManifestKey is lazy loading enabled
			 */
			isExtensionPointFacetLazyLoadingEnabled: function (sManifestKey, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(sManifestKey, oManifestExtend);
			},
			isExtensionPointAfterFacetLazyLoadingEnabled: function (sEntitySet, oFacet, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(
						"AfterFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet),
						oManifestExtend);
			},
			isExtensionPointReplaceFacetLazyLoadingEnabled: function (sEntitySet, oFacet, oManifestExtend) {
				return fnExtensionLazyLoadEnabled(
						"ReplaceFacet|" + sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet),
						oManifestExtend);
			},
			/**
			 * This function returns facet extensions key
			 * For eg: "BeforeFacet|SomeEntity|SomeFacet|Key1"
			 * This function returns Key1
			 * @param {string} sManifestKey
			 * @returns {string} key of extension
			 */
			getFacetExtensionKey: function(sManifestKey){
				if (sManifestKey){
					return sManifestKey.split('|')[3];
				}
				return false;
			},
			getRepeatIndex: function (oValue) {
				if (oValue && oValue.getPath()) {
					var sPadding = "0000000000";
					var sPaddedIndex = sPadding + ((parseInt(oValue.getPath().substring(oValue.getPath().lastIndexOf("/") + 1), 10) + 1 ) * 10).toString();
					return sPaddedIndex.substr(sPaddedIndex.length - sPadding.length);
				} else {
					Log.error("Annotation Helper: Unable to get index.");
				}
			},

			isEntityResponsiveTable: function(oEntities, oEntityType){
				if(oEntities && oEntities[oEntityType.name] == "ResponsiveTable")
					return true;
				else
					return false;
			},

			getRespTableSelectionMode: function(oEntityType){
				if(oEntityType["vui.bodc.workspace.SummaryGroup"] 
					&& oEntityType["vui.bodc.workspace.SummaryGroup"].Bool === "true"){
					return "SingleSelectMaster";
				}
				if(oEntityType['UI.SelectionMode']){
					if(oEntityType['UI.SelectionMode'].Mode.String == "Multi")
						return "MultiSelect";
					else {
						if(oEntityType['UI.SelectionMode'].Mode.String == "NoSelect")
							return "None";
					} 
				}
				return "MultiSelect";
			},

			getUITableSelectionMode: function(oEntityType, type){
				if((oEntityType["vui.bodc.workspace.SummaryGroup"] 
				&& oEntityType["vui.bodc.workspace.SummaryGroup"].Bool === "true") ||
				(oEntityType["vui.bodc.workspace.SingleSelect"] && oEntityType["vui.bodc.workspace.SingleSelect"].Bool === "true")){
					if(type == "ENABLEMULTISELECTBUTTON"){
						return false;
					}
					return "Single";
				}
				if(oEntityType['UI.SelectionMode']){
					if(oEntityType['UI.SelectionMode'].Mode.String == "Multi"){
						if(type == "ENABLEMULTISELECTBUTTON"){
							return true;
						}
						return "Single"; //Can be switched Using button
	//					return "MultiToggle";  
					}else {
						if(oEntityType['UI.SelectionMode'].Mode.String == "NoSelect")
							if(type == "ENABLEMULTISELECTBUTTON"){
								return false;
							}
							return sap.ui.table.SelectionMode.None;
					} 
				}
				if(type == "ENABLEMULTISELECTBUTTON"){
					return true;
				}
				return "Single";
			},
			getBulkEditButtonVisibility : function(oInterface,oEntitySet){
				var oFunctionImport = oInterface.getModel().getODataFunctionImport(oEntitySet.name+"_BulkEditApply");
				if(oFunctionImport == null || oFunctionImport == undefined)
					return false;
				var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
				if(oUpdateRestrictions && oUpdateRestrictions.Updatable ){
					if( oUpdateRestrictions.Updatable.Bool == "false" ){
						return false;
					}else{
						return true;
					}
				}else{
					return true;
				}
			},

			showRowLevelFilterButton : function(oInterface,oEntitySet){
				var functionImport = oInterface.getModel().getODataFunctionImport(oEntitySet.name + "_ADD_FILTER");
				if(functionImport != null)
					return true;

				return false;
			},

			getFilterMessageStripText:function(oEntitySet,showDetailDetail){
				if(showDetailDetail)
					return "";
				else{
					return "{parts: [{value: '" + oEntitySet.name + "'} , {path: 'viewModel>/aDocFilters'}, {path: 'viewModel>/aDocFiltersLength'} ], formatter: 'zvui.work.controller.AnnotationHelper.getFilterMessageText'}";
				}
			},

			getFilterMessageText : function(entitySet, aDocEntries, length){
				if(!aDocEntries){
					return "";
				}else{
					var text = "";
					for(var i = 0; i < aDocEntries.length; i ++ ){
						var childEntry = _.findWhere(aDocEntries[i].children,{ entitySet : entitySet});
						if(childEntry){
							text = childEntry.text;
						}
					}
					return text;
				}
				return "";
			},
			showFilterMessageStrip:function(oEntitySet,showDetailDetail){
				if(showDetailDetail)
					return false;
				else{
					return "{parts: [{value: '" + oEntitySet.name + "'} , {path: 'viewModel>/aDocFilters'} , {path: 'viewModel>/aDocFiltersLength'}], formatter: 'zvui.work.controller.AnnotationHelper.isFilterMessageStripVisible'}";

				}
			},

			isFilterMessageStripVisible : function(entitySet, aDocEntries, length){
				if(!aDocEntries){
					return false;
				}else{
					for(var i = 0; i < aDocEntries.length; i ++ ){
						var childEntry = _.findWhere(aDocEntries[i].children,{ entitySet : entitySet});
						if(childEntry){
							return true;
						}
					}
				}
				return false;
			},

			getSmartTableRowActionCount: function(oInterface,oEntitySet, listEntityType, showDetailButton) {
//				if(showDetailButton)
//					return 1;
//				else {
					var count = 0;
//					var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
//					if(oUpdateRestrictions && oUpdateRestrictions.Updatable ){
//						if( oUpdateRestrictions.Updatable.Bool == "false" ){
//						}else{
//							count = count + 1;
//						}
//					}else{
//						count = count + 1;
//					}
//					if(listEntityType["vui.bodc.workspace.SummaryDetails"]){
//						count = count + 1;
//					}
					var functionImport = oInterface.getInterface(0).getModel().getODataFunctionImport(oEntitySet.name + "_ADD_FILTER");
					if(functionImport != null)
						count = count + 1;

					if(listEntityType["com.sap.vocabularies.UI.v1.Facets"]){				
						var facet = listEntityType["com.sap.vocabularies.UI.v1.Facets"].find(function(facet){ 
							return !facet.TabHide || facet.TabHide.String !== "True"
						});	
						if(facet) count = count + 1;
					}
					return count;
//				}
			},

			getColumnListItemType: function(listEntityType, listEntitySet){
				if(!listEntityType["com.sap.vocabularies.UI.v1.Facets"]){
					return "{parts: [{path: 'viewModel>/sectionPopover'},{value:'" + listEntitySet.name +"'},{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'},{value:'false'}], formatter: 'zvui.work.controller.AnnotationHelper.getColumnListType'}";
				}
				var facet = listEntityType["com.sap.vocabularies.UI.v1.Facets"].find(function(facet){ 
					return !facet.TabHide || facet.TabHide.String !== "True"
				});				
				if(facet){
//					return true;
					return "{parts: [{path: 'viewModel>/sectionPopover'},{value:'" + listEntitySet.name +"'},{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'},{value:'true'}], formatter: 'zvui.work.controller.AnnotationHelper.getColumnListType'}";
				}else{
					return "{parts: [{path: 'viewModel>/sectionPopover'},{value:'" + listEntitySet.name +"'},{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'},{value:'false'}], formatter: 'zvui.work.controller.AnnotationHelper.getColumnListType'}";
//					return "{parts: [{path: 'viewModel>/cuttentRoute'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
//					return false;
				}
			},
			
			getColumnListType: function(sectionPopover, entityset, showingSideContent, havingFacets){
				if(sectionPopover && sectionPopover.open && sectionPopover.entitySet && 
				   sectionPopover.entitySet == entityset){
					return "Inactive";
				}else{
					if(havingFacets && havingFacets !== 'false'){
						return "Navigation";	
					}else{
//						if(showingSideContent){
//							return "Navigation";
//						}else{
							return "Inactive";
//						}
					}										
				}				
			},

//			getColumnListType : function(showingSideContent) {
//				if(showingSideContent){
//					return "Navigation";
//				}else{
//					return "Inactive";
//				}
//			},
			getshowDetailDetailButton: function(ShowDetailDetail){
				if(ShowDetailDetail){
					return true;
				}else{
					return false;
				}
			},

			// The result is either Navigation or Inactive or a binding string which resolve to one of these two possibilities
//			getColumnListItemType : function(oListEntitySet, aSubPages, oManifest, oManifestSettings, bIsDraftEnabled, sAnnotationPath) {
//			var sRouteConfigName = oManifestSettings && oManifestSettings.routeConfig && oManifestSettings.routeConfig.name;
//			var bIsList = sRouteConfigName === "root"; // information, whether we are on the root pagee
//			// check for special feature: navigation from list report to object page via navigationProperty
//			var bIsListWithNavigationProperty = bIsList && aSubPages.some(function(oSubPage){
//			return oSubPage.navigationProperty;
//			});
//			var bAllowsNavigationInEditMode = bIsDraftEnabled || bIsList; // in non-draft mode forward navigation is disabled in edit mode
//			return getNavigationBinding(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bAllowsNavigationInEditMode, false, bIsListWithNavigationProperty);
//			},
			// Returns the expression binding/ value for the row action count in the Grid/ Analytical table in the Detail Page for chevron display.
			getRowActionCountForDetailPage : function(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bIsDraftEnabled) {
				return getRowActionCount(oListEntitySet, aSubPages, oManifest, sAnnotationPath, bIsDraftEnabled);
			},
			// Returns the expression binding/value for the row action count in the Grid/ Analytical table in the List Report for chevron display.
			getRowActionCountForListReport : function(oListEntitySet, aSubPages, oManifest,oManifestSettings) {
				return getRowActionCount(oListEntitySet, aSubPages, oManifest, "", true);
			},

			hasSubObjectPage: function(oListEntitySet, aSubPages) {
				return hasSubObjectPage(oListEntitySet, aSubPages);
			},

			// Check for Creatable-Path. Returns either true, false, or creatable-path
			isRelatedEntityCreatable: function (oInterface, oSourceEntitySet, oRelatedEntitySet, aSubPages, oFacet, oSections, bIsDraftEnabled) {

				var result = false;
				var oModel = oInterface.getInterface(0).getModel();
				var oInsertRestrictions = oSourceEntitySet["Org.OData.Capabilities.V1.InsertRestrictions"];
				var oSourceEntityType = oModel.getODataEntityType(oSourceEntitySet.entityType);

				if (oAnnotationHelper.hasSubObjectPage(oRelatedEntitySet, aSubPages) || (oSections && oAnnotationHelper.isInlineCreate(oFacet, oSections))) {
					if (bIsDraftEnabled) {
						result = "{= ${ui>/editable}}";
					} else {
						result = "{= !${ui>/editable}}";
					}


					// check if there are Insert Restrictions.
					if (oInsertRestrictions && oInsertRestrictions.NonInsertableNavigationProperties && oInsertRestrictions.NonInsertableNavigationProperties.length > 0) {
						// find the Insert Restriction for the RelatedEntitySet if available
						for (var i = 0; i < oInsertRestrictions.NonInsertableNavigationProperties.length; i++) {
							var oNavigationProperty = oInsertRestrictions.NonInsertableNavigationProperties[i];
							var sNavigationPropertyPath = zvui.work.controller.AnnotationHelper._getNonInsertableNavigationPropertyPath(oNavigationProperty);

							if (sNavigationPropertyPath) {	// if Navigation Property Path is undefined, skip this iteration
								var oAssociationSetEnd = oModel.getODataAssociationSetEnd(oSourceEntityType, sNavigationPropertyPath); // get the association set end

								//check if entity set of the Navigation Property Path matches to the input parameter RelatedEntitySet.
								if (oAssociationSetEnd && oAssociationSetEnd.entitySet === oRelatedEntitySet.name) {
									if (oNavigationProperty.If && oNavigationProperty.If.length === 2) { // 2 entries: 1st is the condition and the 2nd is the navigation path
										var oIfCondition = oNavigationProperty.If[0]; // 1st entry is the If condition
										var sFullCreatablePath = oIfCondition.Not ? oIfCondition.Not.Path : oIfCondition.Path;

										// Check if the creatable-path is valid.
										if (zvui.work.controller.AnnotationHelper._isPropertyPathBoolean(oModel, oSourceEntitySet.entityType, sFullCreatablePath)) {
											zvui.work.controller.AnnotationHelper._actionControlExpand(oInterface, sFullCreatablePath, oSourceEntityType.name); // expand the Creatable-Path
											if (bIsDraftEnabled) {
												if (oIfCondition.Not) {
													result = "{= ${ui>/editable} ? ${" + sFullCreatablePath + "} : false}";
												} else {
													result = "{= ${ui>/editable} ? !${" + sFullCreatablePath + "} : false}";
												}
											} else {
												if (oIfCondition.Not) {
													result = "{= !${ui>/editable} ? ${" + sFullCreatablePath + "} : false}";
												} else {
													result = "{= !${ui>/editable} ? !${" + sFullCreatablePath + "} : false}";
												}
											}
										} else {
											result = false; // if the creatable-path is not valid, disable creation; assuming error in the annotations
											Log.warning("Creatable-Path is not valid. Creation for " + oRelatedEntitySet.name + " is disabled");
										}
									} else {
										result = false; //there is no IF condition therefore the creation for the related entity is disabled
									}
									break; // stop loop
								}
							}
						}
					}
				}
				return result;
			},
			/***************************************************************
			Get the Navigation Property Path from the annotations with IF or not.
			 ***************************************************************/
			_getNonInsertableNavigationPropertyPath: function (oNavigationProperty) {
				var sNavigationPropertyPath;
				if (oNavigationProperty.NavigationPropertyPath) {
					sNavigationPropertyPath = oNavigationProperty.NavigationPropertyPath; // no IF annotation
				} else if (oNavigationProperty.If) {
					sNavigationPropertyPath = oNavigationProperty.If[1].NavigationPropertyPath; // 2nd entry in for the IF is the Navigation Property Path
				}
				return sNavigationPropertyPath;
			},

			areDeleteRestrictionsValid: function (oModel, sEntityType, mRestrictions) {
				// Valid if there is no restrictions,
				var result = !(mRestrictions && mRestrictions.Deletable && mRestrictions.Deletable.Bool && mRestrictions.Deletable.Path) &&
				((!mRestrictions) || (mRestrictions.Deletable && mRestrictions.Deletable.Bool)
						|| (mRestrictions.Deletable && mRestrictions.Deletable.Path && zvui.work.controller.AnnotationHelper._isPropertyPathBoolean(oModel, sEntityType, mRestrictions.Deletable.Path)));

				if (!result) {
					Log.error("Service Broken: Delete Restrictions annotations are invalid. ");
				}
				return result;
			},

			_areUpdateRestrictionsValid: function (oModel, sEntityType, mRestrictions) {
				// Valid if there is no restrictions,
				var result = !(mRestrictions && mRestrictions.Updatable && mRestrictions.Updatable.Bool && mRestrictions.Updatable.Path) &&
				((!mRestrictions) || (mRestrictions.Updatable && mRestrictions.Updatable.Bool)
						|| (mRestrictions.Updatable && mRestrictions.Updatable.Path && zvui.work.controller.AnnotationHelper._isPropertyPathBoolean(oModel, sEntityType, mRestrictions.Updatable.Path)));

				if (!result) {
					Log.error("Service Broken: Delete Restrictions annotations are invalid. ");
				}
				return result;
			},

			_isPropertyPathBoolean: function (oModel, sEntityTypeName, sPropertyPath) {
				var sProperty = sPropertyPath;
				var oPathEntityType = oModel.getODataEntityType(sEntityTypeName);
				if (sProperty.indexOf("/") > -1) { // if it's a navigation path, we have to expand to find the right entity type
					var aPathParts = sProperty.split("/");
					for (var j = 0; j < aPathParts.length - 1; j++) {  // go through the parts finding the last entity type;
						var oAssociationEnd = oModel.getODataAssociationEnd(oPathEntityType, aPathParts[j]);
						oPathEntityType = oModel.getODataEntityType(oAssociationEnd.type);
					}
					sProperty = aPathParts[aPathParts.length - 1]; // last entry in array is a property
				}

				var oODataProperty = oModel.getODataProperty(oPathEntityType, sProperty);
				return (oODataProperty && oODataProperty.type === "Edm.Boolean");
			},
			actionControl: function (oInterface, sActionApplicablePath, sEntityType, oDataField) {
				//If UI.Hidden annotation is used, UI.Hidden gets the highest priority
				if (oDataField["com.sap.vocabularies.UI.v1.Hidden"]) {
					return zvui.work.controller.AnnotationHelper.getBindingForHiddenPath(oDataField);
				} else {
					sActionApplicablePath = oDataField.ActionControl.String;
					zvui.work.controller.AnnotationHelper._actionControlExpand(oInterface, sActionApplicablePath, sEntityType);
					if (sActionApplicablePath) {
						//return "{path: '" + sActionApplicablePath + "'}";
						return "{parts: [{path: '"+ sActionApplicablePath + "'}], formatter: 'zvui.work.controller.AnnotationHelper.isActionVisible'}";

//						sActionApplicablePath = "${" + sActionApplicablePath + "}";
//						return "{= " + sActionApplicablePath + " === '' }";
					} else {
						return "true";
					}
				}
			},

			isActionVisible : function(sActionControl){
				if(sActionControl == ''){
					return true;
				}else{
					return false;
				}
			},

			_actionControlExpand: function (oInterface, sPath, sEntityType) {
				var aExpand = [], sExpand;
				oInterface = oInterface.getInterface(0);
				var oMetaModel = oInterface.getModel();
				var oEntityType = oMetaModel.getODataEntityType(sEntityType);
				// check if expand is needed
				if (sPath) {
					sExpand = zvui.work.controller.AnnotationHelper._getNavigationPrefix(oMetaModel, oEntityType, sPath);
					if (sExpand) {
						aExpand.push(sExpand);
					}
				}
				if (aExpand.length > 0) {
					// we analyze a facet that is part of the root context
					// set expand to expand data bag
					var oPreprocessorsData = oInterface.getSetting("preprocessorsData");
					if (oPreprocessorsData) {
						var aRootContextExpand = oPreprocessorsData.rootContextExpand || [];
						for (var j = 0; j < aExpand.length; j++) {
							if (aRootContextExpand.indexOf(aExpand[j]) === -1) {
								aRootContextExpand.push(aExpand[j]);
							}
						}
						oPreprocessorsData.rootContextExpand = aRootContextExpand;
					}
				}
			},
			getEntityTypesForFormPersonalization: function (oInterface, oFacet, oEntitySetContext) {
				oInterface = oInterface.getInterface(0);
				var aEntityTypes = [];
				var oMetaModel = oInterface.getModel();
				var oEntitySet = oMetaModel.getODataEntitySet(oEntitySetContext.name || '');
				var aFacets = [];
				if (oFacet.RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet" && oFacet.Facets) {
					aFacets = oFacet.Facets;
				} else if (oFacet.RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
					aFacets.push(oFacet);
				}
				aFacets.forEach(function (oFacet) {
					var sNavigationProperty;
					if (oFacet.Target && oFacet.Target.AnnotationPath && oFacet.Target.AnnotationPath.indexOf("/") > 0) {
						sNavigationProperty = oFacet.Target.AnnotationPath.split("/")[0];
						var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
						var oAssociationEnd = oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty);
						if (oAssociationEnd && oAssociationEnd.entitySet) {
							oEntitySet = oMetaModel.getODataEntitySet(oAssociationEnd.entitySet);
							if (aEntityTypes.indexOf(oEntitySet.entityType.split(".")[1]) === -1) {
								aEntityTypes.push(oEntitySet.entityType.split(".")[1]);
							}
						}
					} else {
						if (aEntityTypes.indexOf(oEntitySetContext.entityType.split(".")[1]) === -1) {
							aEntityTypes.push(oEntitySetContext.entityType.split(".")[1]);
						}
					}
				});
				return aEntityTypes.join(", ");
			},

			_mapTextArrangement4smartControl: function(sTextArrangementIn) {
				var sTextArrangement = "descriptionAndId";
				switch (sTextArrangementIn) {
				case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
					sTextArrangement = "idAndDescription";
					break;
				case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
					sTextArrangement = "idOnly";
					break;
				case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
					sTextArrangement = "descriptionOnly";
					break;
				default:
					break;
				}
				return sTextArrangement;
			},

			getTextArrangementForSmartControl: function (oInterface, oField, refEntitySet, oEntitySet) {
				oInterface = oInterface.getInterface(0);
				var oEntityType;
				var oMetaModel = oInterface.getModel();

				if (refEntitySet.name == undefined) {
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				} else {
					oEntityType = oMetaModel.getODataEntityType(refEntitySet.entityType);
				}

				var sTextArrangement = "descriptionAndId";
				if  (oMetaModel.getODataProperty(oEntityType, oField.Value.Path)) {
					var oPropertyTextModel = oMetaModel.getODataProperty(oEntityType, oField.Value.Path)["com.sap.vocabularies.Common.v1.Text"];
					// 1. check TextArrangement definition for property
					if (oPropertyTextModel && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"] && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
						sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
								oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
					}
				}
				// 2. check TextArrangement definition for entity type
				if (oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"] && oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
					sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
							oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
				}
				return sTextArrangement;
			},

			getWorklistTableTitle: function(oHeader) {
				var rSingleQuote = new RegExp("'", 'g');
				var rDoubleQuote = new RegExp('"', 'g');
				if (oHeader && oHeader.TypeNamePlural && oHeader.TypeNamePlural.String) {
					var sTableTitleI18n = oHeader.TypeNamePlural.String;
					sTableTitleI18n = sTableTitleI18n.replace(rSingleQuote,"\\'");
					sTableTitleI18n = sTableTitleI18n.replace(rDoubleQuote,'\\"');
					if (sTableTitleI18n === '') {
						return "";
					} else if ( sTableTitleI18n.indexOf(">") > -1 ){
						sTableTitleI18n = "@i18n>" + sTableTitleI18n.split(">")[1].split("}")[0];
					} else {
						sTableTitleI18n = "@i18n>" + sTableTitleI18n;
					}
					return "{parts: [{path: '" + sTableTitleI18n + "'}, {path: '" + sTableTitleI18n + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatTableTitle'}";
				} else {
					return "";
				}
			},
			checklockexists: function (oEntitySet, oEntityType, oCollection, oLineItems){

			},
			setTableBindingPath: function(oEntitySet,oListEntitySet, oListEntityType, oFacets, oFacet, oHeader, annotationPath){
				var path="";
//				if(oEntitySet.entityType.endsWith('WorkspaceViewType'))
//				path = "";
//				else
				path = annotationPath.slice(0, annotationPath.indexOf('/'));
				return path;
			},
			setChartBindingPath: function(oInterface, annotationPath){
				var path="";
				var oMetaModel = oInterface.getModel();
				var sResolvedPath = sap.ui.model.odata.AnnotationHelper.resolvePath(oMetaModel.getContext(oInterface.getPath()));
//				if(oEntitySet.entityType.endsWith('WorkspaceViewType'))
//				path = "";
//				else
				path = annotationPath.slice(0, annotationPath.indexOf('/'));
				return path;
			},
			setTableType: function(TableType){
				return null;
			},
			setTableFilterId: function(oListEntitySet, oListEntityType, oFacet, oHeader){
				if(oFacet.Label.String == 'Header'){
					return "smartFilterBar";
				}else{
					return "";
				}
			},

			getTableTitle: function (aFacets, oFacet, oHeader) {
				var sParentLabelString = null;
				var mLineItemLabelMap = new Map();	//map holds lineItem's target as key and section label as value
				var rSingleQuote = new RegExp("'", 'g');
				var rDoubleQuote = new RegExp('"', 'g');
				var fnGetLineItemMapDetails  = function (aFacets, sParentLabelString) {
					for (var i = 0; i < aFacets.length; i++) {
						if (aFacets[i].RecordType === "com.sap.vocabularies.UI.v1.CollectionFacet") {
							fnGetLineItemMapDetails(aFacets[i].Facets, aFacets[i].Label.String);
						} else if (aFacets[i].RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet" && aFacets[i].Target && aFacets[i].Target.AnnotationPath.indexOf("LineItem") > -1) {
							if (sParentLabelString !== null) {
								// label of parent collection facet which is having lineItem as a reference facet
								mLineItemLabelMap.set(aFacets[i].Target.AnnotationPath, sParentLabelString);
							} else {
								//reference facet having lineItem
								mLineItemLabelMap.set(aFacets[i].Target.AnnotationPath, aFacets[i].Label.String);
							}
						}
					}
				};
				fnGetLineItemMapDetails(aFacets, sParentLabelString);
				var sFacetI18nString = mLineItemLabelMap.get(oFacet.Target.AnnotationPath);
				sFacetI18nString = sFacetI18nString.replace(rSingleQuote, "\\'");
				sFacetI18nString = sFacetI18nString.replace(rDoubleQuote, '\\"');
				if (sFacetI18nString.indexOf(">") > -1 ) {
					sFacetI18nString = "@i18n>" + sFacetI18nString.split(">")[1].split("}")[0];
				} else {
					sFacetI18nString = "@i18n>" + sFacetI18nString;
				}
				if (oHeader && oHeader.TypeNamePlural && oHeader.TypeNamePlural.String) {
					var sTableTitleI18n = oHeader.TypeNamePlural.String;
					sTableTitleI18n = sTableTitleI18n.replace(rSingleQuote,"\\'");
					sTableTitleI18n = sTableTitleI18n.replace(rDoubleQuote,'\\"');
					if (sTableTitleI18n === '') {
						return "";
					} else if ( sTableTitleI18n.indexOf(">") > -1 ){
						sTableTitleI18n = "@i18n>" + sTableTitleI18n.split(">")[1].split("}")[0];
					} else {
						sTableTitleI18n = "@i18n>" + sTableTitleI18n;
					}
					return "{parts: [{path: '" + sTableTitleI18n + "'}, {path: '" + sFacetI18nString + "'}], formatter: 'zvui.work.controller.AnnotationHelper.formatTableTitle'}";
				} else {
					return "";
				}
			},

			formatTableTitle: function (sTableTitle, sSectionTitle) {
//				if ( sTableTitle && sTableTitle !== sSectionTitle ) {
				return sTableTitle;
//				}
//				return "";
			},

			getTitle: function (oSourceEntityType, oSourceClickedField, sNavigationProperty) {
				var sResult;
				var oTextArrangement = oAnnotationHelper.getTextArrangementObject(oSourceEntityType, oSourceClickedField, sNavigationProperty);
				if (oTextArrangement){
					sResult = oAnnotationHelper.getTitleTextArrangementBindingPath(oTextArrangement.textArrangement, oTextArrangement.propertyPath, oTextArrangement.textPath);
				}
				return sResult;
			},

			getDescription: function (oSourceEntityType, oSourceClickedField, sNavigationProperty) {
				var sResult;
				var oTextArrangement = oAnnotationHelper.getTextArrangementObject(oSourceEntityType, oSourceClickedField, sNavigationProperty);
				if (oTextArrangement){
					sResult = oAnnotationHelper.getDescriptionTextArrangementBindingPath(oTextArrangement.textArrangement, oTextArrangement.propertyPath, oTextArrangement.textPath);
				}
				return sResult;
			},
			getTextArrangementObject: function (oSourceEntityType, oSourceClickedField, sNavigationProperty) {
				var sTextArrangement, sPropertyPath, sTextPath;
				if (oSourceClickedField) {
					//title
					sPropertyPath = oSourceClickedField.name;
					//text
					var oPropertyTextModel = oSourceClickedField["com.sap.vocabularies.Common.v1.Text"];
					if (oPropertyTextModel){
						sTextPath = oPropertyTextModel.Path;
					}
					//evaluate text arrangement
					sTextArrangement = oAnnotationHelper.getTextArrangement(oSourceEntityType, oSourceClickedField);
					return {textArrangement : sTextArrangement,
						propertyPath : sPropertyPath,
						textPath : sTextPath};
				}
			},
			getTextArrangement: function (oEntityType, oField){
				var sTextArrangement;
				// 1. check TextArrangement definition for property directly - has prio 1
				if (oField["com.sap.vocabularies.UI.v1.TextArrangement"] && oField["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
					sTextArrangement = oAnnotationHelper._mapTextArrangement4smartControl(oField["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
				}
				// 2. check TextArrangement definition under property/text - has prio 2
				if (!sTextArrangement){
					var oPropertyTextModel = oField["com.sap.vocabularies.Common.v1.Text"];
					if (oPropertyTextModel && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"] && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
						sTextArrangement = oAnnotationHelper._mapTextArrangement4smartControl(oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
					}
				}
				// 3. check TextArrangement definition for entity type
				if (!sTextArrangement){
					if (oEntityType && oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"] && oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
						sTextArrangement = oAnnotationHelper._mapTextArrangement4smartControl(oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
					}
				}
				if (!sTextArrangement){ //coming from the title should get a readable description and underneath is the id - the default
					sTextArrangement = "descriptionAndId";
				}
				return sTextArrangement;
			},
			getTitleTextArrangementBindingPath: function (sTextArrangement, sPropertyPath, sTextPath) {
				var sPropertyBinding = "{" + sPropertyPath + "}";
				var sTextBinding = "{" + sTextPath + "}";
				//in case the text is not annotated it can't be first, so the property will be displayed
				if (!sTextPath){
					return sPropertyBinding;
				}

				if (sTextArrangement === "descriptionAndId"){ 			//TEXTFIRST
					return sTextBinding;
				} else if (sTextArrangement === "descriptionOnly"){		//TEXTONLY
					return sTextBinding;
				} else if (sTextArrangement === "idAndDescription"){	//TEXTLAST
					return sPropertyBinding;
				} else if (sTextArrangement === "idOnly"){				//TEXTSEPERATE
					return sPropertyBinding;
				}
			},
			getDescriptionTextArrangementBindingPath: function (sTextArrangement, sPropertyPath, sTextPath) {
				var sPropertyBinding = "{" + sPropertyPath + "}";
				var sTextBinding = "{" + sTextPath + "}";
				//in case the text is not annotated it will be shown in the title only
				if (!sTextPath){
					return "";
				}

				if (sTextArrangement === "descriptionAndId"){ 			//TEXTFIRST
					return sPropertyBinding;
				} else if (sTextArrangement === "descriptionOnly"){		//TEXTONLY
					return "";
				} else if (sTextArrangement === "idAndDescription"){	//TEXTLAST
					return sTextBinding;
				} else if (sTextArrangement === "idOnly"){				//TEXTSEPERATE
					return "";
				}
			},

			isDeepFacetHierarchy: function (oFacet) {
				if (oFacet.Facets) {
					return true;
				}else {
					return false;
				}
			},

			isHeaderContentVisible : function(oEntitySet) {
				var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
				if(oUpdateRestrictions && oUpdateRestrictions.Updatable ){
					if( oUpdateRestrictions.Updatable.Bool == "false" ){
						return true;
					}else{
						return "{= !${ui>/editable} }";	
					}
				}else{
					return "{= !${ui>/editable} }";
				}
			},

			worklistAddEnabled: function(oEntitySet){
				return "{parts: [{path: 'viewModel>/mnttp'}, {path: 'ui>/editable'}, {value: '" + oEntitySet.name + "'}, {path: 'viewModel>/selectedPaths/entity'}], formatter: 'zvui.work.controller.AnnotationHelper.worklistAddButtonEnabled'}";
			},

			worklistAddButtonEnabled: function(mnttp, editable, oEntitySet, oEntity1) {
				if(mnttp == ""){
					return true;
				}else{
					if(!editable){
						return false;
					}else{
						if(oEntitySet == oEntity1)
							return false;
						else
							return true;
					}
				}
			},

			worklistDeleteEnabled: function(oEntitySet){
				return "{parts: [ {path: 'ui>/editable'}, {value: '" + oEntitySet.name + "'}, {path: 'viewModel>/selectedPaths/entity'}], formatter: 'zvui.work.controller.AnnotationHelper.worklistDeleteButtonEnabled'}";
			},

			worklistDeleteButtonEnabled: function(editable, oEntitySet, oEntity1) {
				if(!editable){
					return false;
				}else{
					if(oEntitySet == oEntity1)
						return false;
					else
						return true;
				}
			},

			isSmartTableEditable : function(oEntitySet,oFacet, oEntities, oEntityType,showDetailDetail) {
//				Used for Smart Table Editablity, Add Button Enable, Delete Button Enable			

//				if(oEntities && oEntityType){
//					var responsiveTable = zvui.work.controller.AnnotationHelper.isEntityResponsiveTable(oEntities,oEntityType);
//					if(responsiveTable)
//						return false;
//				}
				if(!showDetailDetail){
					showDetailDetail = false;
				}
				var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
				if(oUpdateRestrictions && oUpdateRestrictions.Updatable ){
					if( oUpdateRestrictions.Updatable.Bool == "false" ){
						return false;
					}else{
						if(oFacet.TabControl)
							return "{parts: [{path: 'ui>/editable'}, {value: " + showDetailDetail + "}, {path: 'viewModel>/drilldown'}, {path: 'viewModel>/sectionPopover'}, {value: '"+ oEntitySet.name + "'}, {path: 'viewModel>/" + oEntitySet.name + "showingSideContent'}, {path: '" + oFacet.TabControl.String + "'}], formatter: 'zvui.work.controller.AnnotationHelper.isTableEditable'}";
						else
							return "{parts: [{path: 'ui>/editable'}, {value: " + showDetailDetail + "}, {path: 'viewModel>/drilldown'}, {path: 'viewModel>/sectionPopover'}, {value: '"+ oEntitySet.name + "'},{path: 'viewModel>/" + oEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.isTableEditable'}";
					}
				}else{
					if(oFacet && oFacet.TabControl)
						return "{parts: [{path: 'ui>/editable'}, {value: " + showDetailDetail + "}, {path: 'viewModel>/drilldown'}, {path: 'viewModel>/sectionPopover'}, {value: '"+ oEntitySet.name + "'}, {path: 'viewModel>/" + oEntitySet.name + "showingSideContent'}, {path: '" + oFacet.TabControl.String + "'}], formatter: 'zvui.work.controller.AnnotationHelper.isTableEditable'}";
					else
						return "{parts: [{path: 'ui>/editable'}, {value: " + showDetailDetail + "}, {path: 'viewModel>/drilldown'}, {path: 'viewModel>/sectionPopover'}, {value: '"+ oEntitySet.name + "'}, {path: 'viewModel>/" + oEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.isTableEditable'}";
				}
			},

			isTableEditable : function(oEditable, showDetailDetail, drilldown, sectionPopover, sEntitySet, showingSideContent, oTabControl){
				if(sectionPopover && sectionPopover.open && sectionPopover.entitySet && sectionPopover.entitySet == sEntitySet){
					return false;
				}
				
				if(!oEditable) {
					return oEditable;
				}

				if(oTabControl == 'D'){
					return false;
				}
				
				
				if(showDetailDetail){
					if(showingSideContent){
						return false;
					}else{
						return true;
					}	
				}else{
					if(drilldown || showingSideContent){
						return false;
					}else{
						return true;
					}
				}
				this.invalidate();
			},

			showSmartTableEditButton: function(listEntitySet, showingSideContent){
				if(listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'] &&
						listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'].Updatable.Bool == "false"	){
					return false;
				}else{
					if(showingSideContent){
						return false;
					}else
						return true;
				}
			},
			
			isDSCinfoBarVisible: function(listEntitySet){
				return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showDscApply'}], formatter: 'zvui.work.controller.AnnotationHelper.getDSCinfoBarVisible'}";
			},
			
			getDSCinfoBarVisible: function(showDscApply){
				if(showDscApply){
					return true;
				}else{
					return false;
				}
			},

			isTableShowToolsVisible: function(listEntitySet, source){
				return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'},{path: 'viewModel>/disp_only'}, {value: '"+ source +"'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableShowToolsVisible'}";
			},

			getTableShowToolsVisible: function(showingSideContent,disp_only, source){
				if(showingSideContent){
					if(source == "close"){
						return true;
					}
					return false;
				}else{
					if(source == "close"){
						return false;
					}
					if(disp_only){
						return false;
					}else{
						return true;
					}
				}
			},

			isTableNavigationVisible: function(listEntityType, listEntitySet){
//				return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
//				return "{parts: [{path: 'viewModel>/cuttentRoute'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
//				return false; //DrillDown button not required now. If required comment this line
				if(!listEntityType["com.sap.vocabularies.UI.v1.Facets"]){
//					return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
					return false;
				}
				var facet = listEntityType["com.sap.vocabularies.UI.v1.Facets"].find(function(facet){ 
					return !facet.TabHide || facet.TabHide.String !== "True"
				});				
				if(facet){
					return true;
				}else{
//					return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
//					return "{parts: [{path: 'viewModel>/cuttentRoute'}], formatter: 'zvui.work.controller.AnnotationHelper.getTableNavigationVisible'}";
					return false;
				}
			},

			getTableNavigationVisible: function(showingSideContent){
				if(showingSideContent){
					return true;
				}else{
					return false;
				}
			},
			
			/*getTableNavigationVisible: function(currentRoute){
				if(currentRoute == "Detail"){
					return true;
				}else if(currentRoute == "DetailDetail"){
					return false;
				}
			},*/
			
			showTableDetailButton: function(listEntitySet, listEntityType){
				if(listEntityType["vui.bodc.workspace.SummaryDetails"]){
					return false;
				}
				return "{parts: [{path: 'viewModel>/" + listEntitySet.name + "showSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.getDetailButtonVisible'}";
			},
			
			getDetailButtonVisible: function(showSideContent){
				if(showSideContent == undefined || showSideContent){
					return true;
				}else{
					return false;
				}
			},
			
			getMultiInputEditability : function(oDataField) {
				if(oDataField.FieldControl) {
					var sTabApplicablePath = oDataField.FieldControl.String;
//					return "{= ${" + sTabApplicablePath + "} != 1 }";
					return "{parts: [{path: '" + sTabApplicablePath + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getMultiInputFieldEditable'}";
				}else{
					return "{ui>/editable}"
				}
			},

			getMultiInputFieldEditable : function(fieldControl){
				if(fieldControl != 1)
					return true;
				return false;
			},
			
//			getDetailPageFooterVisibility: function(oInterface, entitySet, entityType){
//				oInterface = oInterface.getInterface(0);
//				var oMetaModel = oInterface.getModel();
//				var returnValue = true;
//				
//				var aFacets = entityType["com.sap.vocabularies.UI.v1.Facets"];
//				for(var i = 0; i < aFacets["length"]; i++){
//					var sNavigationProperty;
//					if (aFacets[i].Target && aFacets[i].Target.AnnotationPath && aFacets[i].Target.AnnotationPath.indexOf("/") > 0) {
//						sNavigationProperty = aFacets[i].Target.AnnotationPath.split("/")[0];
//						var oEntity = oMetaModel.getODataAssociationSetEnd(entityType,sNavigationProperty);
//						var oEntitySet = oMetaModel.getODataEntitySet(oEntity.entitySet);
//						var oUpdateRestrictions = oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
//						if(oUpdateRestrictions && oUpdateRestrictions.Updatable ){
//							if( oUpdateRestrictions.Updatable.Bool == "false" ){
//								returnValue =  false;
//							}else{
//								returnValue =  true;
//								break;
//							}
//						}else{
//							returnValue =  true;
//							break;
//						}
//					}	
//				}
//				return returnValue;
//				
//			},
			
			getPrepareTabForFacet: function(oFacet,oEntitySet){
				if(oFacet.TabHide && oFacet.TabHide.String && oFacet.TabHide.String == "True"){
					return false;
				}else{
					return true;
				}
			},
			
			getVisibilityForFacet : function(oFacet,oEntitySet) {
				if(oFacet.TabHide && oFacet.TabHide.String && oFacet.TabHide.String == "True"){
					return false;
				}
				if(oFacet.TabControl) {
					var sTabApplicablePath = oFacet.TabControl.String;
					return "{= ${" + sTabApplicablePath + "} !== 'H' }";
				}else{
					var visible = true;
					if(oFacet.Facets) {
						visible = false;
						for(var i = 0; i < oFacet.Facets.length; i++) {
							if(oFacet.Facets[i].Target.AnnotationPath != "@com.sap.vocabularies.UI.v1.Identification"){
								visible = true;
							}
						}
						if(!visible)
							return "{ui>/editable}"
					}
					return visible;
				}
			},

			isDefaultSection : function(oFacet) {
				if(oFacet.ID) {
					if(oFacet.ID.String === 'DFLT') {
						return true;
					}else{
						return false;
					}
				}
				return false;
			},

			doesCollectionFacetOnlyContainForms: function (oFacet) {
				var bReturn = true;
				if (oFacet.Facets) {
					for (var i = 0; i < oFacet.Facets.length; i++) {
						if (oFacet.Facets[i].Target && oFacet.Facets[i].Target.AnnotationPath) {
							if ((oFacet.Facets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.FieldGroup") < 0)
									&& (oFacet.Facets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.Identification") < 0)
									&& (oFacet.Facets[i].Target.AnnotationPath.indexOf("com.sap.vocabularies.UI.v1.DataPoint") < 0)) {
								bReturn = false;
							}
						}
					}
				} else {
					bReturn = false;
				}
				return bReturn;
			},

			doesFieldGroupContainOnlyOneMultiLineDataField: function (oFieldGroup, oFirstDataFieldProperties) {
				if (oFieldGroup.Data.length !== 1) {
					return false;
				}
				if ((oFirstDataFieldProperties['com.sap.vocabularies.UI.v1.MultiLineText'] === undefined)
						|| (oFieldGroup.Data[0].RecordType !== "com.sap.vocabularies.UI.v1.DataField")) {
					return false;
				}
				return true;
			},
			testFormatter: function(value) {
				return "formatted:" + value;
			},
			getFacetID: function(sEntitySet, oFacet) {
				return sEntitySet + "|" + zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
			},
			isListReportTemplate: function(oRouteConfig) {

				if (oRouteConfig) {
					return oRouteConfig.template === "sap.suite.ui.generic.template.ListReport";
				}
			},
			isAnalyticalListPageOrListReportTemplate: function(oRouteConfig) {
				if (oRouteConfig) {
					return (oRouteConfig.template === "sap.suite.ui.generic.template.AnalyticalListPage" || oRouteConfig.template === "sap.suite.ui.generic.template.ListReport");
				}
			},
			getStableIdPartForDatafieldActionButton: function(oDatafield, oFacet, oTabItem, oChartItem) {
				var sStableId = "";
				var sDatafieldStableId = "";
				var sFacetStableId = "";
				if (oFacet) {
					sFacetStableId = zvui.work.controller.AnnotationHelper.getStableIdPartFromFacet(oFacet);
				}
				if (oDatafield) {
					sDatafieldStableId = zvui.work.controller.AnnotationHelper.getStableIdPartFromDataField(oDatafield);
				}
				sStableId = (sFacetStableId !== "" ? sFacetStableId + "::" : "") + "action::" + sDatafieldStableId;
				var sSuffix = zvui.work.controller.AnnotationHelper.getSuffixFromIconTabFilterKey(oTabItem);
				if (sSuffix) {
					sStableId = sStableId.concat(sSuffix);
				}
				if (oChartItem){
					sStableId = sStableId + "::chart";
				}
				return sStableId;
			},
			_hasCustomDeterminingActionsInListReport: function(sEntitySet, oManifestExt) {
				if (oManifestExt && oManifestExt[sEntitySet]) {
					var oManifestExtEntitySet = oManifestExt[sEntitySet];
					if (oManifestExtEntitySet.Actions) {
						for (var action in oManifestExtEntitySet.Actions) {
							if (oManifestExtEntitySet.Actions[action].determining) {
								return true;
							}
						}
					}
				}
				return false;
			},
			_hasCustomDeterminingActionsInObjectPage: function(sEntitySet, oManifestExt) {
				if (oManifestExt && oManifestExt[sEntitySet]) {
					var oManifestExtEntitySet = oManifestExt[sEntitySet];
					if (oManifestExtEntitySet.Header && oManifestExtEntitySet.Header.Actions) {
						for (var action in oManifestExtEntitySet.Header.Actions) {
							if (oManifestExtEntitySet.Header.Actions[action].determining) {
								return true;
							}
						}
					}
				}
				return false;
			},
			hasDeterminingActionsRespectingApplicablePath: function(oContext, aTerm, sEntitySet, oManifestExt) {
				var sApplicablePaths = "";
				oContext = oContext.getInterface(0);
				if (sEntitySet && oManifestExt && oManifestExt["sap.suite.ui.generic.template.ObjectPage.view.Details"] &&
						zvui.work.controller.AnnotationHelper._hasCustomDeterminingActionsInObjectPage(sEntitySet, oManifestExt["sap.suite.ui.generic.template.ObjectPage.view.Details"]["sap.ui.generic.app"])) {
					return "true";
				}
				if (aTerm){
					for (var iRecord = 0; iRecord < aTerm.length; iRecord++) {
						if ((aTerm[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction") &&
								aTerm[iRecord].Determining && aTerm[iRecord].Determining.Bool === "true") {
							var sFunctionImport = oContext.getModel().getODataFunctionImport(aTerm[iRecord].Action.String, true);
							var oFunctionImport = oContext.getModel().getObject(sFunctionImport);
							if (oFunctionImport["sap:applicable-path"]) {
								if (sApplicablePaths.length > 0) {
									sApplicablePaths += " || ";
								}
								sApplicablePaths += "${path: '" + oFunctionImport["sap:applicable-path"] + "'}";
							} else {
								return "true";
							}
						}
					}
				}
				if (sApplicablePaths.length > 0) {
					return "{= " + sApplicablePaths +  " || ${ui>/editable}}";
				} else {
					return "{ui>/editable}";
				}
			},
			hasDeterminingActions: function(aTerm, sEntitySet, oManifestExt) {
				if (sEntitySet && oManifestExt && oManifestExt["sap.suite.ui.generic.template.ListReport.view.ListReport"] &&
						zvui.work.controller.AnnotationHelper._hasCustomDeterminingActionsInListReport(sEntitySet, oManifestExt["sap.suite.ui.generic.template.ListReport.view.ListReport"]["sap.ui.generic.app"])) {
					return "true";
				} else if (sEntitySet && oManifestExt && oManifestExt["sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage"] &&
						zvui.work.controller.AnnotationHelper._hasCustomDeterminingActionsInListReport(sEntitySet, oManifestExt["sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage"]["sap.ui.generic.app"])) { //Check for AnalyticalListPage
					return "true";
				}
				for (var iRecord = 0; iRecord < aTerm.length; iRecord++) {
					if ((aTerm[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForAction" || aTerm[iRecord].RecordType === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") &&
							aTerm[iRecord].Determining && aTerm[iRecord].Determining.Bool === "true") {
						return "true";
					}
				}

				return "false";
			},

			actionControlDetermining: function(oRouteConfig, sActionApplicablePath, oDataField) {
				//If UI.Hidden annotation is used, UI.Hidden gets the highest priority
				if (oDataField["com.sap.vocabularies.UI.v1.Hidden"]) {
					return  zvui.work.controller.AnnotationHelper.getBindingForHiddenPath(oDataField);
				} else if (zvui.work.controller.AnnotationHelper.isListReportTemplate(oRouteConfig) || !sActionApplicablePath) {
					return true;
				} else {
					return "{path: '" + sActionApplicablePath + "'}";
				}
			},
			actionControlInline: function(sActionApplicablePath) {
				if (!sActionApplicablePath) {
					return true;
				} else {
					return "{path: '" + sActionApplicablePath + "'}";
				}
			},
			actionControlBreakout: function(sActionApplicablePath) {
				if (!sActionApplicablePath) {
					return true;
				} else {
					return "{path: '" + sActionApplicablePath + "'}";
				}
			},

			/**
			 * Build a binding expression that will executed at runtime to calculate the percent value for a datapoint, so it can be consumed in the Progress Indicator.
			 * Rules to calculate:
			 * If the UoM is % then use the value as the percent value
			 * If the UoM is not % or is not provided then build the expression to calculate the percent value = data point value / target * 100
			 * The expression will be then resolved at runtime by the view
			 * Responsibility, resolve paths at pre-processing
			 * @function
			 * @private
			 * @parameter {sap.ui.core.util.XMLPreprocessor.IContext|sap.ui.model.Context} oInterface Callback interface object
			 * @parameter {map} dataPoint A DataPoint map as per the vocabulary term com.sap.vocabularies.UI.v1.DataPoint
			 * @parameter {map} [mUoM] A map containg the unit of measure as per the vocabulary term Org.OData.Measures.V1.Unit or Org.OData.Measures.V1.ISOCurrency
			 * @returns {string} A binding expression containing the formula to calculate the Progress Indicator percent value
			 */
			buildExpressionForProgressIndicatorPercentValue : function(oInterface, dataPoint, mUoM){
				var sPercentValueExpression = "0";

				if (dataPoint.Value && dataPoint.Value.Path){ // Value is mandatory and it must be a path
					var sValue = "$" + sap.ui.model.odata.AnnotationHelper.format(oInterface, dataPoint.Value); // Value is expected to be always a path. ${Property}
					var sTarget, sUoM;

					if (dataPoint.TargetValue){ // Target can be a path or Edm Primitive Type
						sTarget = sap.ui.model.odata.AnnotationHelper.format(oInterface, dataPoint.TargetValue);
						sTarget = dataPoint.TargetValue.Path ? "$" + sTarget : sTarget;
					}

					if (mUoM){ // UoM or Currency can be a path or directly in the annotation
						mUoM = mUoM['Org.OData.Measures.V1.Unit'] || mUoM["Org.OData.Measures.V1.ISOCurrency"];
						if (mUoM){
							sUoM = sap.ui.model.odata.AnnotationHelper.simplePath(oInterface, mUoM);
							sUoM = sUoM && mUoM.Path ?  "$" + sUoM : "'" + sUoM + "'";
						}
					}

					// The expression consists of the following parts:
					// 1) When UoM is '%' then percent = value (target is ignored), and check for boundaries (value > 100 and value < 0).
					// 2) When UoM is not '%' (or is not provided) then percent = value / target * 100, check for division by zero and boundaries:
					// percent > 100 (value > target) and percent < 0 (value < 0)
					// Where 0 is Value, 1 is Target, 2 is UoM
					var sExpressionForUoMPercent = "({0} > 100 ? 100 : {0} < 0 ? 0 : {0} * 1)";
					var sExpressionForUoMNotPercent = "(({1}*1 > 0) ? (({0}*1 > {1}*1) ? 100 : (({0}*1 < 0) ? 0 : ({0} / {1} * 100))) : 0)";
					var sExpressionTemplate = "'{'= ({2} === ''%'') ? " + sExpressionForUoMPercent + " : " + sExpressionForUoMNotPercent + " '}'";
					sPercentValueExpression = jQuery.sap.formatMessage(sExpressionTemplate, [sValue, sTarget, sUoM]);
				}

				return sPercentValueExpression;
			},

			/**
			 * The resposibility of this method is to build an expression and its parts to call the runtime formatter to display value
			 * This formatter is called at pre-processing time
			 * @function
			 * @private
			 * @parameter {sap.ui.core.util.XMLPreprocessor.IContext|sap.ui.model.Context} oInterface Callback interface object
			 * @parameter {map} dataPoint A DataPoint map as per the vocabulary term com.sap.vocabularies.UI.v1.DataPoint
			 * @parameter {map} [mUoM] A map containg the unit of measure as per the vocabulary term Org.OData.Measures.V1.Unit or Org.OData.Measures.V1.ISOCurrency
			 * @returns {string} A binding expression containing the formatter and parts to compute the Progress Indicator display value
			 */
			buildExpressionForProgressIndicatorDisplayValue : function(oInterface, dataPoint, mUoM){
				var sParts;

				var buildPart = function(oInterface, oProperty){
					var sPropertyPath = zvui.work.controller.AnnotationHelper.trimCurlyBraces(sap.ui.model.odata.AnnotationHelper.format(oInterface, oProperty));
					var sPart = "{path: '" + sPropertyPath + "'}";
					return sPart;
				};

				sParts = buildPart(oInterface, dataPoint.Value) + ", " + buildPart(oInterface, dataPoint.TargetValue) + ", " + buildPart(oInterface, mUoM);

				var sDisplayValueExpression = "{ parts: [" + sParts + "], formatter: 'zvui.work.controller.AnnotationHelper.formatDisplayValue' }";
				return sDisplayValueExpression;
			},

			/**
			 * This function is meant to run at runtime, so the control and resource bundle can be available
			 * @function
			 * @private
			 * @parameter {string} sValue A string containing the value
			 * @parameter {string} sTarget A string containing the target value
			 * @parameter {string} sUoM A string containing the unit of measure
			 * @returns {string} A string containing the text that will be used in the display value of the Progress Indicator
			 */
			formatDisplayValue : function(sValue, sTarget, sUoM){
				var sDisplayValue = "";
				if (sValue !== null && sValue !== undefined) {
					sValue = sValue.toString();
				}
				if (sValue){
					var oControl = this;
					var oResourceBundle = oControl.getModel("i18n").getResourceBundle();
					var aCustomData = oControl.getCustomData();
					var oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
					sValue = sap.ui.core.format.NumberFormat.getInstance(oLocale).format(sValue);
					sTarget = sTarget || aCustomData.filter(function(oObject) {
						if (oObject.getKey() === "Target") {
							return oObject;
						}
					});
					sTarget = typeof (sTarget) === "object" ? (sTarget[0] && sTarget[0].getValue()) : sTarget;

					sUoM = sUoM || aCustomData.filter(function(oObject) {
						if (oObject.getKey() === "UoM") {
							return oObject;
						}
					});
					sUoM = typeof (sUoM) === "object" ? (sUoM[0] && sUoM[0].getValue()) : sUoM;
					if (sUoM) {
						if (sUoM === '%'){ // uom.String && uom.String === '%'
							sDisplayValue = oResourceBundle.getText("PROGRESS_INDICATOR_DISPLAY_VALUE_UOM_IS_PERCENT", [sValue]);
						} else {// (uom.String and not '%') or uom.Path
							if (sTarget){
								sTarget = sap.ui.core.format.NumberFormat.getInstance(oLocale).format(sTarget);
								sDisplayValue = oResourceBundle.getText("PROGRESS_INDICATOR_DISPLAY_VALUE_UOM_IS_NOT_PERCENT", [sValue, sTarget, sUoM]);
							} else {
								sDisplayValue = oResourceBundle.getText("PROGRESS_INDICATOR_DISPLAY_VALUE_UOM_IS_NOT_PERCENT_NO_TARGET_VALUE", [sValue, sUoM]);
							}
						}
					} else {
						if (sTarget){
							sTarget = sap.ui.core.format.NumberFormat.getInstance(oLocale).format(sTarget);
							sDisplayValue = oResourceBundle.getText("PROGRESS_INDICATOR_DISPLAY_VALUE_NO_UOM", [sValue, sTarget]);
						} else {
							sDisplayValue = sValue;
						}
					}
				} else { // Cannot do anything
					Log.warning("Value property is mandatory, the default (empty string) will be returned");
				}

				return sDisplayValue;
			},

			/**
			 * Build a binding expression for criticality in the progress indicator data point.
			 * Step 1: Check if datapoint is annotated with CriticalityType or CriticalityCalculationType
			 * Step 2: For CriticalityType build the binding expression to check if the property contains, Name or Value of the enumType (Example: 'UI.CriticalityType/Neutral' or '0')
			 * Other cases are not valid and the default sap.ui.core.ValueState.None will be returned
			 * Step 3: For CriticalityCalculationType build the binding expression to calculate the criticality
			 * @parameter {sap.ui.core.util.XMLPreprocessor.IContext|sap.ui.model.Context} oInterface Callback interface object
			 * @parameter {map} dataPoint A DataPoint map as per the vocabulary term com.sap.vocabularies.UI.v1.DataPoint
			 * @returns {string} A binding expression for the criticality property of the Progress Indicator
			 */
			buildExpressionForProgressIndicatorCriticality : function(oInterface, dataPoint){
				var sFormatCriticalityExpression = sap.ui.core.ValueState.None;
				var sExpressionTemplate;
				var oCriticalityProperty = dataPoint.Criticality;

				if (oCriticalityProperty) {
					sExpressionTemplate = "'{'= ({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Negative'') || ({0} === ''1'') || ({0} === 1) ? ''" + sap.ui.core.ValueState.Error + "'' : " +
					"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Critical'') || ({0} === ''2'') || ({0} === 2) ? ''" + sap.ui.core.ValueState.Warning + "'' : " +
					"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Positive'') || ({0} === ''3'') || ({0} === 3) ? ''" + sap.ui.core.ValueState.Success + "'' : " +
					"''" + sap.ui.core.ValueState.None + "'' '}'";
					if (oCriticalityProperty.Path){
						var sCriticalitySimplePath = '$' + sap.ui.model.odata.AnnotationHelper.simplePath(oInterface, oCriticalityProperty);
						sFormatCriticalityExpression = jQuery.sap.formatMessage(sExpressionTemplate, sCriticalitySimplePath);
					} else if (oCriticalityProperty.EnumMember){
						var sCriticality = "'" + oCriticalityProperty.EnumMember + "'";
						sFormatCriticalityExpression = jQuery.sap.formatMessage(sExpressionTemplate, sCriticality);
					} else {
						Log.warning("Case not supported, returning the default sap.ui.core.ValueState.None");
					}
				} else {
					// Any other cases are not valid, the default value of 'None' will be returned
					Log.warning("Case not supported, returning the default sap.ui.core.ValueState.None");
				}

				return sFormatCriticalityExpression;
			},

			trimCurlyBraces : function (value){
				return value ? value.replace("{","").replace("}","") : undefined;
			},

			/**
			 * Get entity set name for Smart Chart and Smart Microchart.
			 * Returns the name of the main entity set (current node in the object page) or the referenced entity set (as per the target of the annotation path).
			 * @parameter {object} refEntitySet The referenced entity set
			 * @parameter {object} entitySet The entity set of the current object in the page
			 * @returns {string} sEntitySetName The entity set name for the main object type or the referenced entity set
			 */
			getEntitySetName : function (refEntitySet, entitySet) {
				var sEntitySetName = "";
				try {
					sEntitySetName = refEntitySet.name || entitySet.name;
				} catch (oError) {
					Log.warning("At least one of the input parameters is undefined. Returning default value for entity set name.");
				}
				return sEntitySetName;
			},

			getBreakoutActionEnabledKey: function (oAction, oTabItem) {
				var sButtonId = zvui.work.controller.AnnotationHelper.getBreakoutActionButtonId(oAction, oTabItem);
				var sEnabledKey = "{_templPriv>/generic/listCommons/breakoutActionsEnabled/" + sButtonId + "/enabled}";
				return sEnabledKey;
			},
			buildVisibilityExprOfDataFieldForIntentBasedNaviButton: function (oDataField) {
				//If UI.Hidden annotation is used, UI.Hidden gets the highest priority
				if (oDataField["com.sap.vocabularies.UI.v1.Hidden"]) {
					return  zvui.work.controller.AnnotationHelper.getBindingForHiddenPath(oDataField);
				} else if (!!oDataField.RequiresContext && oDataField.RequiresContext.Bool == "false" && (!oDataField.Inline || oDataField.Inline.Bool === "false")) {
					// oDataField.Inline is Nullable=true, i.e. it may be absent in the annotations
					// oDataField.RequiresContext is Nullable as well, its defaut value is "true"
					var sSemanticObject = oDataField.SemanticObject.String;
					var sAction =  oDataField.Action.String;
					return "{= !!${_templPriv>/generic/supportedIntents/" + sSemanticObject + "/" + sAction + "/visible}}"; // maybe we can optimize it later and do one call for all buttons in the toolbar somewhere
				} else {
					return true; // if the button is inline or the button is in the toolbar and has requresContext=true the button is always visible and is enabled/disabled depending on the context
				}
			},

			/*
			 * oLineItem contains a path to the LineItem which can be with or without a qualifier
			 *
			 */
			getSmartTableContextType : function(oEntities, oEntityType) {
				//return "responsiveTable";
//				var responsiveTable = zvui.work.controller.AnnotationHelper.isEntityResponsiveTable(oEntities,oEntityType);
//				if(responsiveTable){
//				return "responsiveTable";
//				}else{
//				return "table";
//				}
				var tableType = oEntities[oEntityType.name]
				return "{parts: [{value: '" + tableType + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getContextType'}";
			},
			getContextType : function(tableType){
				if(tableType == "ResponsiveTable") {
					return "responsiveTable";
				}else{
					return "table";
				}
			},
			formatLockType: function(editingStatus) {
				if (editingStatus == "2") {
					return sap.m.ObjectMarkerType.Locked;
				}
//				else{
//				if(updateIndicator == 'U')
//				return sap.m.ObjectMarkerType.Unsaved;
//				}
				return sap.m.ObjectMarkerType.Flagged;
			},

			formatLockVisibility: function(editingStatus) {
				return sap.m.ObjectMarkerVisibility.IconAndText; //Default text and icon
			},

			formatLockLineItemVisible: function(editingStatus) {
				if (editingStatus == "2") {
					return true;
				}
//				else{
//				if(updateIndicator == 'U')
//				return true;
//				}
				return false;
			},

			// Returns full user name or ID of owner of a draft with status "unsaved changes" or "locked" in the format "by full name" or "by UserId"
			// If the user names and IDs are not maintained we display for example "locked by another user"
			formatLockOwner: function(lockedBy) {
				var sLockOwnerDescription = "";
				if (lockedBy != undefined && lockedBy != null && lockedBy != "") {
					sLockOwnerDescription = lockedBy;
				}
				return sLockOwnerDescription;
			},

			searchForFirstSemKey_Title_Description: function(oEntityType) {
				var sLineItemPath, sTargetString, iLastOccurenceOfSlash, sEntityTypePath, sRelativeLineItemPath, oModel, bTitle, bDescr, iDescIndex, iTitleIndex, oEntityTypeAnnotations, sFirstSemKeyPropPath, aLineItemAnnotations, oHeaderInfoAnnotations, sHeaderTitle, sHeaderDescription, iLineItemsNumber, i;
				if (!oEntityType) {
					return;
				}
				sEntityTypePath = oEntityType.getPath();
				//if (sLineItemPath.indexOf("com.sap.vocabularies.UI.v1.LineItem") < 0) {
				//	return;
				//}
				//iLastOccurenceOfSlash = sLineItemPath && sLineItemPath.lastIndexOf("/");
				// = sLineItemPath.substring(0, iLastOccurenceOfSlash);
				//sRelativeLineItemPath = sLineItemPath.substring(iLastOccurenceOfSlash + 1); // we want to get 'com.sap.vocabularies.UI.v1.LineItem' part
				oModel = oEntityType.getModel();
				oEntityTypeAnnotations = oModel && oModel.getObject(sEntityTypePath);
				if(oEntityTypeAnnotations["vui.bodc.NonResponsiveLineItem"]){
					sRelativeLineItemPath = "vui.bodc.NonResponsiveLineItem";
				}else{
					sRelativeLineItemPath = "vui.bodc.ResponsiveLineItem";
				}
				sLineItemPath = sEntityTypePath + "/" + sRelativeLineItemPath;
				if (oEntityTypeAnnotations) {
					// we consider the first field of the semantic key only, the same way SmartTable does
					sFirstSemKeyPropPath = oEntityTypeAnnotations["com.sap.vocabularies.Common.v1.SemanticKey"] && oEntityTypeAnnotations["com.sap.vocabularies.Common.v1.SemanticKey"][0] && oEntityTypeAnnotations["com.sap.vocabularies.Common.v1.SemanticKey"][0].PropertyPath;
					aLineItemAnnotations = oEntityTypeAnnotations[sRelativeLineItemPath];
					oHeaderInfoAnnotations = oEntityTypeAnnotations["com.sap.vocabularies.UI.v1.HeaderInfo"];

					sHeaderTitle = "";
					sHeaderDescription = "";
					if (oHeaderInfoAnnotations) {
						sHeaderTitle = oHeaderInfoAnnotations && oHeaderInfoAnnotations["Title"] && oHeaderInfoAnnotations["Title"].Value && oHeaderInfoAnnotations["Title"].Value.Path;
						sHeaderDescription = oHeaderInfoAnnotations && oHeaderInfoAnnotations["Description"] && oHeaderInfoAnnotations["Description"].Value && oHeaderInfoAnnotations["Description"].Value.Path;
					}
					iLineItemsNumber = aLineItemAnnotations && aLineItemAnnotations.length;
					sTargetString = sLineItemPath + "/";
					for (i = 0; i < iLineItemsNumber; i++) {
						if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path === sFirstSemKeyPropPath) {
							if (oAnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
								continue;
							}
							sTargetString = sTargetString + i + '/Value/Path';
							return sTargetString;
						}
						if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path === sHeaderTitle) {
							if (oAnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
								continue;
							}
							bTitle = true;
							iTitleIndex = i;
						}
						if (aLineItemAnnotations[i].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aLineItemAnnotations[i].Value.Path === sHeaderDescription) {
							if (oAnnotationHelper.isPropertyHidden(aLineItemAnnotations[i])) {
								continue;
							}
							bDescr = true;
							iDescIndex = i;
						}
					}
					if (bTitle) {
						sTargetString = sTargetString + iTitleIndex + '/Value/Path';
						return sTargetString;
					} else if (bDescr) {
						sTargetString = sTargetString + iDescIndex + '/Value/Path';
						return sTargetString;
					}
				} else { // Cannot do anything
					Log.warning("No entity type provided");
				}
			},

			isPropertyHidden: function(oLineItemAnnotations) {
				var bHidden = false;
				// "com.sap.vocabularies.Common.v1.FieldControl" annotation is deprecated but we check it here for compatibility reasons
				if (oLineItemAnnotations["com.sap.vocabularies.UI.v1.Hidden"] || (oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"] &&
						oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember &&
						oLineItemAnnotations["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember === "com.sap.vocabularies.Common.v1.FieldControlType/Hidden")) {
					bHidden = true;
				}
				return bHidden;
			},

			getColumnHeaderText: function(oDataFieldValue, oDataField) {
				var sResult;
				if(oDataFieldValue.name == 'edtst'){
					return "";
				}
				if (oDataField.Label) {
					sResult = oDataField.Label.String;
				}else{
					if(oDataFieldValue["com.sap.vocabularies.Common.v1.Label"]
					&& oDataFieldValue["com.sap.vocabularies.Common.v1.Label"].String) {
						sResult = oDataFieldValue["com.sap.vocabularies.Common.v1.Label"].String;
					}else {
						if(oDataFieldValue["sap:label"])
							sResult = oDataFieldValue["sap:label"];
						else  {
							sResult = "";
						}
					}
				}
				return sResult;
			},

			getColumnToolTip: function(oDataFieldValue, oDataField) {
				var sResult;
				if (oDataField.Label) {
					return oDataField.Label.String;
				} else {
					sResult = oDataFieldValue["sap:quickinfo"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.QuickInfo"] || "" ).String
					|| oDataFieldValue["sap:label"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
					return sResult;
				}
			},

			getTextForDataField: function(oDataFieldValue) {
				var sValue = oDataFieldValue["com.sap.vocabularies.Common.v1.Text"] && oDataFieldValue["com.sap.vocabularies.Common.v1.Text"].Path;
				return sValue;
			},

			getColumnCellFirstText: function(oDataFieldValue, oDataField, oEntityType, bCheckVisibility) {
				var sResult, sTextArrangement;
				sTextArrangement = oAnnotationHelper.getTextArrangement(oEntityType, oDataFieldValue);
				switch (sTextArrangement) {
				case "idAndDescription":
					sResult = oDataField.Value.Path;
					if (!sResult) {
						sResult = oAnnotationHelper.getTextForDataField(oDataFieldValue);
					}
					break;
				case "idOnly":
					sResult = oDataField.Value.Path;
					if (!sResult) {
						sResult = oAnnotationHelper.getTextForDataField(oDataFieldValue);
					}
					break;
				case "descriptionAndId":
				case "descriptionOnly":
				default:
					sResult = oAnnotationHelper.getTextForDataField(oDataFieldValue);
				if (!sResult) {
					sResult = oDataField.Value.Path;
				}
				break;
				}
				if (sResult) {
					if (bCheckVisibility) {
						return true;
					} else {
						if (oDataFieldValue.type === "Edm.DateTimeOffset" || oDataFieldValue.type === "Edm.DateTime" || oDataFieldValue.type === "Edm.Time") {
							var sFormattedDateTime =  oAnnotationHelper.formatDateTimeForCustomColumn(oDataFieldValue.type, sResult);
							return sFormattedDateTime;
						} else {
							return "{" + sResult + "}";
						}
					}
				}
			},

			getColumnCellSecondText: function(oDataFieldValue, oDataField, oEntityType, bCheckVisibility) {
				var sResult;
				sResult = oAnnotationHelper.getTitlePath(oDataFieldValue, oDataField, oEntityType);

				if (sResult) {
					if (bCheckVisibility) {
						return true;
					} else {
						if (oDataFieldValue.type === "Edm.DateTimeOffset" || oDataFieldValue.type === "Edm.DateTime" || oDataFieldValue.type === "Edm.Time") {
							var sFormattedDateTime =  oAnnotationHelper.formatDateTimeForCustomColumn(oDataFieldValue.type, sResult);
							return sFormattedDateTime;
						} else {
							return "{" + sResult + "}";
						}
					}
				}
			},

			getTitlePath: function(oDataFieldValue, oDataField, oEntityType){
				var sResult, sTextArrangement;
				sTextArrangement = oAnnotationHelper.getTextArrangement(oEntityType, oDataFieldValue);
				switch (sTextArrangement) {
				case "idOnly":
				case "descriptionOnly":
					break;
				case "idAndDescription":
					// if the Value.Path does not exist the v1.Text has been used as the first text already
					if (!oDataField.Value.Path) {
						break;
					}
					sResult = oAnnotationHelper.getTextForDataField(oDataFieldValue);
					break;
				case "descriptionAndId":
				default:
					// if this text does not exist oDataField.Value.Path has been already used as the first text so it should not be set as the second text again
					if (!oAnnotationHelper.getTextForDataField(oDataFieldValue)) {
						break;
					}
				// if no text arrangement annotation is maintained the second text should be oDataField.Value.Path if available
				sResult = oDataField.Value.Path;
				break;
				}
				return sResult;
			},

			getHeaderVisibility: function(oDataFieldValue, oDataField, oEntityType){
				var sTitlePath, sTextArrangement;
				sTitlePath = oAnnotationHelper.getTitlePath(oDataFieldValue, oDataField, oEntityType);
				if (!sTitlePath){
					//Special Case for datafield value of type "Edm.DateTimeOffset", "Edm.DateTime" and "Edm.Time".
					//getColumnCellFirstCell returns value rather than path for these types.
					if (oDataFieldValue.type === "Edm.DateTimeOffset" || oDataFieldValue.type === "Edm.DateTime" || oDataFieldValue.type === "Edm.Time"){
						sTitlePath = oAnnotationHelper.getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType);
						return "{= " +  sTitlePath + " ? false : true}";
					} else {
						sTitlePath = oAnnotationHelper.getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType).replace("{","").replace("}","");
					}
				} else {
					sTextArrangement = oAnnotationHelper.getTextArrangement(oEntityType, oDataFieldValue);
					if (!sTextArrangement || sTextArrangement === "descriptionAndId"){
						sTitlePath = oAnnotationHelper.getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType).replace("{","").replace("}","");
					}
					if (sTextArrangement === "idAndDescription"){
						sTitlePath = oAnnotationHelper.getTitlePath(oDataFieldValue, oDataField, oEntityType);
					}
				}
				if (sTitlePath){
					return "{= ${path: '" + sTitlePath + "'} ? false : true}";
				}
				return false;
			},


			// Formats Edm.DateTimeOffset, Edm.DateTime and Edm.Time type values to 'medium' format for custom column.
			formatDateTimeForCustomColumn: function(oDataFieldValueType, sResult) {
				if (oDataFieldValueType === "Edm.DateTimeOffset") {
					return "{ path: '" + sResult + "', type: 'sap.ui.model.odata.type.DateTimeOffset', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
				} else if (oDataFieldValueType === "Edm.DateTime") {
					return "{ path: '" + sResult + "', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
				} else {
					return "{ path: '" + sResult + "', type: 'sap.ui.model.odata.type.Time', formatOptions: { style: 'medium'}}";
				}
			},

			getAdditionalSemanticObjects: function(oDataFieldValue) {
				var oAnnotation;
				var aAdditionalSemObjects = [];
				for (oAnnotation in oDataFieldValue) {
					if (oAnnotation.indexOf("com.sap.vocabularies.Common.v1.SemanticObject#") != -1) {
						aAdditionalSemObjects.push(oDataFieldValue[oAnnotation].String);
					}
				}
				if (aAdditionalSemObjects.length > 0) {
					return aAdditionalSemObjects;
				}
			},

			getColumnCellFirstTextVisibility: function(oDataFieldValue, oDataField, oEntityType) {
				var bCheckVisibility = true;
				var bVisible = !!oAnnotationHelper.getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility);
				return bVisible;
			},

			getColumnCellSecondTextVisibility: function(oDataFieldValue, oDataField, oEntityType){
				var bCheckVisibility = true;
				var bVisible = !!oAnnotationHelper.getColumnCellSecondText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility);
				return bVisible;
			},

			isSmartLink: function(oDataFieldValue) {
				var oAnnotation;
				for (oAnnotation in oDataFieldValue) {
					if (oAnnotation.indexOf('com.sap.vocabularies.Common.v1.SemanticObject') >= 0) {
						return true;
					}
				}
				return false;
			},

			/*Function to Change the threashold of responsive table to 25 when there is just 1 subsection/section on OP, making responsive table occupy the the white space available on the screen.
		Below mentioned are the 2 cases which are not covered:
		1.When hidden section/subsection has extensions.
		2.When hidden section/subsection has reusable components.
			 */
			isSingleSection: function(oAnnotatedSection, oExtensionSection, oManifest) {
				var visibleSection = [];
				var oEmbeddedComponents = oManifest[0].pages[0].embeddedComponents;
				for (var key in oExtensionSection) {
					if ((key.indexOf("AfterFacet") > -1 || key.indexOf("BeforeFacet") > -1 || key.indexOf("AfterSubSection") > -1 || key.indexOf("BeforeSubSection") > -1)) {
						return false;
					}
				}
				for (var i = 0; i < oAnnotatedSection.length; i++) {
					if (!oAnnotatedSection[i].Facets && (!oAnnotatedSection[i]["com.sap.vocabularies.UI.v1.Hidden"] || (oAnnotatedSection[i]["com.sap.vocabularies.UI.v1.Hidden"] && zvui.work.controller.AnnotationHelper.getBindingForHiddenPath(oAnnotatedSection[i])))) {
						visibleSection.push(oAnnotatedSection[i]);
					} else if (oAnnotatedSection[i].Facets) {
						for (var j = 0; j < oAnnotatedSection[i].Facets.length; j++) {
							if ((!oAnnotatedSection[i].Facets[j]["com.sap.vocabularies.UI.v1.Hidden"] || (oAnnotatedSection[i].Facets[j]["com.sap.vocabularies.UI.v1.Hidden"] && zvui.work.controller.AnnotationHelper.getBindingForHiddenPath(oAnnotatedSection[i].Facets[j])))) {
								visibleSection.push(oAnnotatedSection[i].Facets[j]);
							}
						}
					}
				}
				if (visibleSection.length === 1 && visibleSection[0].Target &&
						visibleSection[0].Target.AnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1 &&
						(oEmbeddedComponents === undefined || oEmbeddedComponents === null || (oEmbeddedComponents && Object.keys(oEmbeddedComponents).length === 0))) {
					return true;
				}
			},

			setRowHighlight: function(entityType) {
//				return "{parts: [{path: 'IsActiveEntity'}, {path: 'HasActiveEntity'}, {path: '" + entityType["com.sap.vocabularies.UI.v1.LineItem@com.sap.vocabularies.UI.v1.Criticality"].Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.setInfoHighlight'}";
				return "{parts: [{path: 'rowst'}, {path: 'updkz'}, {path: 'edtst'},{path: 'viewModel>/fromWorklist'}], formatter: 'zvui.work.controller.AnnotationHelper.setInfoHighlight'}";
			},

			setInfoHighlight: function(rowst, updkz, edtst, fromWorklist) {
				if(rowst == "1"){
					return "Warning";
				}else if(rowst == "2"){
					return "Error";
				}else {
					if(updkz == 'U'){
						return "Information";
					}else if(updkz == 'I'){
						return "Information";
					}else{
//						if(!fromWorklist && edtst == 1){
//							return "Information";
//						}
						return "None";
					}
				}				
			},			
			setRowHighlightColor: function(updkz){
				if(updkz == 'U'){
					return "Information";
				}else if(updkz == 'I'){
					return "Information";
				}else{
//					if(!fromWorklist && edtst == 1){
//						return "Information";
//					}
					return "None";
				}
			},
//			setInfoHighlight: function(isActiveEntity, hasActiveEntity) {
//			var oModel = this.getModel();
//			var oMetaModel = oModel.getMetaModel();
//			var oControl = this.getParent();
//			//Performing oControl.getParent() until we get the Smart table, in order to get the entity set of the table
//			while (!oControl.getEntitySet) {
//			oControl = oControl.getParent();
//			}
//			var oEntitySet = oMetaModel.getODataEntitySet(oControl.getEntitySet());
//			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
//			var aControlCustomData = oControl.getCustomData();
//			//getting the lineItem annotations for the current table
//			var oLineItemAnnotation = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
//			//getting the Criticality object.
//			var oCriticalityAnnotation = oEntityType["com.sap.vocabularies.UI.v1.LineItem@com.sap.vocabularies.UI.v1.Criticality"];
//			//checking if the given table's lineItem has a qualifier defined
//			for (var x = 0; x < aControlCustomData.length; x++) {
//			if (aControlCustomData[x].getKey() && aControlCustomData[x].getKey() === "lineItemQualifier") {
//			var slineItemQualifier = aControlCustomData[x].getValue();
//			if (slineItemQualifier) {
//			oCriticalityAnnotation = oEntityType["com.sap.vocabularies.UI.v1.LineItem#" + slineItemQualifier + "@com.sap.vocabularies.UI.v1.Criticality"];
//			break;
//			}
//			}
//			}
//			// Highlights the rows of tables with blue if it is a newly created draft item
//			if (isActiveEntity === false && hasActiveEntity === false) {
//			return "Information";
//			} else if (oLineItemAnnotation && oCriticalityAnnotation) {
//			// Highlights the rows of tables with green/red/yellow if lineItem criticality is defined
//			//check for setting dynamic highlight using Path
//			if (oCriticalityAnnotation.Path) {
//			var sCriticalityPath = oCriticalityAnnotation.Path ;
//			if (this.getBindingContext()) {
//			var oRowContext = this.getBindingContext();
//			var sRowCriticalityValue = oRowContext.getObject(sCriticalityPath);
//			if (sRowCriticalityValue) {
//			switch (sRowCriticalityValue.toString()) {
//			case "0":
//			return "None";
//			case "1":
//			return "Error";
//			case "2":
//			return "Warning";
//			case "3":
//			return "Success";
//			}
//			} else {
//			return "None";
//			}
//			}
//			} else if (oCriticalityAnnotation.EnumMember) {
//			//check for setting static highlight using EnumMember
//			var sCriticalityEnum = oCriticalityAnnotation.EnumMember;
//			if (sCriticalityEnum) {
//			switch (sCriticalityEnum) {
//			case "com.sap.vocabularies.UI.v1.CriticalityType/Neutral":
//			return "None";
//			case "com.sap.vocabularies.UI.v1.CriticalityType/Negative":
//			return "Error";
//			case "com.sap.vocabularies.UI.v1.CriticalityType/Critical":
//			return "Warning";
//			case "com.sap.vocabularies.UI.v1.CriticalityType/Positive":
//			return "Success";
//			}
//			} else {
//			return "None";
//			}
//			}
//			} else {
//			// Provides no highlight to rows if above conditions are not satisfied
//			return "None";
//			}
//			},

			getDataFieldLabel: function(oInterface, oDataFieldValue, oDataField) {
				var sResult;
				if (oDataField.Label) {
					return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Label);
				} else {
					if(oDataFieldValue["com.sap.vocabularies.Common.v1.Label"]
					&& oDataFieldValue["com.sap.vocabularies.Common.v1.Label"].String) {
						sResult = oDataFieldValue["com.sap.vocabularies.Common.v1.Label"].String;
					}else {
						if(oDataFieldValue["sap:label"])
							sResult = oDataFieldValue["sap:label"];
						else
							sResult = "";
					}
					if (sResult === "") {
						var labelFromExtension =  (oDataFieldValue.extensions) ? oDataFieldValue.extensions.find(function(extension){ return extension.name === "label"; }) : null;
						if (labelFromExtension !== undefined && labelFromExtension !== null) {
							if (labelFromExtension.length !== undefined && labelFromExtension.length > 0) {
								sResult = labelFromExtension[0].value;
							} else {
								sResult = labelFromExtension.value;
							}
						} else {
							sResult = "";
						}
					}
					return sResult;
				}
			},

			getDataFieldValue: function(oInterface, oDataFieldValue) {
				if (oDataFieldValue && !oDataFieldValue.Path && !oDataFieldValue.Apply && !oDataFieldValue.String) {
					return "";
				} else {
					return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataFieldValue);
				}
			},
			getUnitFieldValue: function(oInterface, oDataFieldValue) {
				var field = {};
				field.Path = oDataFieldValue;
				return sap.ui.model.odata.AnnotationHelper.format(oInterface, field);
			},
			getUnitFieldDisplay: function(oInterface, oDataField){
//				var field = {};
//				field.Path = oDataFieldValue;
//				return sap.ui.model.odata.AnnotationHelper.format(oInterface, field) == '1'? '' : '6rem';
//				return sap.ui.model.odata.AnnotationHelper.format(oInterface, field);
				if(oDataField["sap:field-control"]){
//					return "{= ${" + oDataField["sap:field-control"] + "} == 1}";	
					return false;
				}else if(oDataField["com.sap.vocabularies.UI.v1.ReadOnly"] &&
						oDataField["com.sap.vocabularies.UI.v1.ReadOnly"].Bool){
					return true;
				}else{
					return false;
				}
				
			},
			getUnitFieldWidth: function(oInterface, oDataField, oEntitySet){
				if(oDataField["sap:field-control"]){	
					return "{parts: [{path: '" + oDataField["sap:field-control"] + "'},{path: 'viewModel>/" + oEntitySet.name + "showingSideContent'}], formatter: 'zvui.work.controller.AnnotationHelper.setUnitFieldWidth'}";
				}else{
					return "";
				}				
			},
			
			setUnitFieldWidth: function(field_control, showingSideContent){
				if(!showingSideContent && field_control && field_control !== 1){
					return "4.75rem";
				}else{
					return "";
				}
			},
			
			getUnitFieldChangeFC: function(oInterface, oDataField){
				if(oDataField["sap:field-control"]){	
					return true;
				}else{
					return false;
				}	
			},
			formatObjectMarker: function(hasDraftEntity, isActiveEntity, inProcessByUser){
				if (hasDraftEntity && isActiveEntity && inProcessByUser) {
					return sap.m.ObjectMarkerType.Locked;
				} else if (hasDraftEntity && isActiveEntity && !inProcessByUser){
					return sap.m.ObjectMarkerType.Unsaved;
				} else {
					return sap.m.ObjectMarkerType.Flagged;
				}
			},

			formatObjectMarkerVisibility: function(hasDraftEntity, isActiveEntity, inProcessByUser){
				if (hasDraftEntity && isActiveEntity && inProcessByUser) {
					return true;
				} else if (hasDraftEntity && isActiveEntity && !inProcessByUser){
					return true;
				} else {
					return false;
				}
			},

			// Returns the entityType and association of target in case of multiple navigation paths
			getRelevantDataForDataField: function (oModel, sDataFieldValuePath, oEntityType) {
				var sNavigationProperty, oAssociationEnd;
				while (sDataFieldValuePath.indexOf('/') > -1) {
					sNavigationProperty = sDataFieldValuePath.split("/")[0];
					sDataFieldValuePath = sDataFieldValuePath.split('/').slice(1).join('/');
					oAssociationEnd = oModel.getODataAssociationEnd(oEntityType, sNavigationProperty);
					oEntityType = oModel.getODataEntityType(oAssociationEnd && oAssociationEnd.type);
				}
				return {
					"entityType" : oEntityType,
					"association" : oAssociationEnd,
					"dataFieldValuePath" : sDataFieldValuePath
				};
			},

			getTextArrangementForSCFields: function (oInterface, oField, oEntitySet, aConnectedDataFields) {
				var oModel = oInterface.getInterface(0).getModel();
				var oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
				var sDataFieldValuePath = oField.Value.Path;
				oEntityType = zvui.work.controller.AnnotationHelper.getRelevantDataForDataField(oModel, oField.Value.Path, oEntityType).entityType;
				var aProperties = oEntityType.property || [];
				var sDescriptionField, sTextArrangement;
				for (var i = 0; i < aProperties.length; i++) {
					if (sDataFieldValuePath === aProperties[i].name) {
						sDescriptionField = aProperties[i]["sap:text"];
						break;
					}
				}
				if(sDescriptionField){
					if(aConnectedDataFields) {
						for (var j = 0; j < aConnectedDataFields.length; j++) {
							if (aConnectedDataFields[j].RecordType === "com.sap.vocabularies.UI.v1.DataField" && aConnectedDataFields[j].Value.Path === sDescriptionField) {
								return "idOnly";
							}
						}
					}
					sTextArrangement = zvui.work.controller.AnnotationHelper.getTextArrangementForSmartControl(oInterface, oField, {}, oEntitySet);
					return sTextArrangement;
				}else{
					return "idOnly";
				}
			},

			checkMultiplicityForDataFieldAssociationST: function (oInterface, oEntitySet, oDataField) {
				if (oDataField.Value && oDataField.Value.Path) {
					var sDataFieldValuePath = oDataField.Value.Path;
					var oMetaModel = oInterface.getModel(0);
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var oAssociation;
					if (!(sDataFieldValuePath.indexOf('/') > -1)) {
						return false;
					}
					while (sDataFieldValuePath.indexOf('/') > -1) {
						var sNavigationProperty = sDataFieldValuePath.split("/")[0];
						sDataFieldValuePath = sDataFieldValuePath.split('/').slice(1).join('/');
						oEntityType = oMetaModel.getODataEntityType(oAssociation && oAssociation.type) || oEntityType;
						oAssociation = oMetaModel.getODataAssociationEnd(oEntityType, sNavigationProperty);
					}
					if (oAssociation && oAssociation.multiplicity === "*") {
						return true;
					}
				}
				return false;
			},

			checkMultiplicityForDataFieldAssociation: function (oInterface, oEntitySet, oDataField) {
				if (oDataField.Value && oDataField.Value.Path) {
					var sDataFieldValuePath = oDataField.Value.Path;
					var oMetaModel = oInterface.getModel(0);
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var oAssociation;
					if (!(sDataFieldValuePath.indexOf('/') > -1)) {
						return true;
					}
					while (sDataFieldValuePath.indexOf('/') > -1) {
						var sNavigationProperty = sDataFieldValuePath.split("/")[0];
						sDataFieldValuePath = sDataFieldValuePath.split('/').slice(1).join('/');
						oEntityType = oMetaModel.getODataEntityType(oAssociation && oAssociation.type) || oEntityType;
						oAssociation = oMetaModel.getODataAssociationEnd(oEntityType, sNavigationProperty);
					}
					if (oAssociation && oAssociation.multiplicity === "*") {
						return false;
					}
				}
				return true;
			},

			/*
		This function determines if a property has a quickViewFacet annotated, and if it does the property name is returned so that quickViewFacet can be rendered even
		 if navigation is not possible
		This function is called for forceLinkRendering in semanticObjectController which expects an object
		SmartLinks expect a boolean value for forceLinkRendering which is not covered in this function, as semanticObectController covers all cases
			 */

			hasQuickViewFacet: function (oInterface, oEntitySet) {
				var oModel = oInterface.getModel();
				var oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
				var aPropertyListWithSemanticObject = [];
				var aPropertyListWithQuickViewFacets = [];
				var oSchema, oTargetEntityType, aSchemas, sNamespace ,sForceLinks;

				/*
			Step 1: Check if property has a semantic object annotated. If not, then link cannot be force - rendered
			Step 2: Loop over all navigation properties
			Step 3:	Look into corresponding associations
			Step 4:	Look into referential constraint
			Step 5:	If dependent role PropertyRef = property which has a semantic object ==> Quick View facets can be retrieved
			Step 6: Add this to the return object
				 */

				if (!oEntityType || !oEntityType.navigationProperty){
					return '\\{\\}';
				}

				// Step 1: Check if property has a semantic object annotated. If not, then link cannot be force - rendered
				var aProperties = oEntityType.property || [];
				for (var i = 0; i < aProperties.length; i++) {
					if (aProperties[i]["com.sap.vocabularies.Common.v1.SemanticObject"]) {
						aPropertyListWithSemanticObject.push(aProperties[i].name);
					}
				}

				// Step 2: Loop over all navigation properties
				for (var i = 0; i < oEntityType.navigationProperty.length; i++) {
					if (oEntityType.navigationProperty.name === "SiblingEntity" ||  oEntityType.navigationProperty.name === "DraftAdministrativeData"){
						continue;
					}
					oTargetEntityType = oModel.getODataEntityType(oModel.getODataAssociationEnd(oEntityType, oEntityType.navigationProperty[i].name).type);
					if (oTargetEntityType["com.sap.vocabularies.UI.v1.QuickViewFacets"]) {
						aSchemas = oModel.getObject("/dataServices/schema");
						sNamespace = oTargetEntityType.namespace;
						for (var j in aSchemas) {
							if (aSchemas[j].namespace === sNamespace) {
								oSchema = aSchemas[j];
								break;
							}
						}
						var oAssociation;
						var aAssociations = oSchema.association;
						var sQualifiedName = oEntityType.navigationProperty[i].relationship;
						var iSeparatorPos = sQualifiedName.lastIndexOf(".");
						var sName = sQualifiedName.slice(iSeparatorPos + 1);

						// Step 3:	Look into corresponding associations
						for (var j in aAssociations) {
							if (aAssociations[j].name === sName) {
								oAssociation = aAssociations[j];
								break;
							}
						}

						// Step 4:	Look into referential constraint
						var aPropertyRef = (oAssociation.referentialConstraint && oAssociation.referentialConstraint.dependent && oAssociation.referentialConstraint.dependent.propertyRef) || [];
						for (var j = 0; j < aPropertyRef.length; j++) {
							// Step 5:	If dependent role PropertyRef = property which has a semantic object ==> Quick View facets can be retrieved
							if (aPropertyListWithSemanticObject.indexOf(aPropertyRef[j].name) !== -1) {
								aPropertyListWithQuickViewFacets.push(aPropertyRef[j].name);
							}
						}
					}
				}
				if (aPropertyListWithQuickViewFacets.length) {
					// Step 6: Add this to the return object
					sForceLinks = '\\{';
					for (var i = 0; i < aPropertyListWithQuickViewFacets.length; i++) {
						sForceLinks += '"' + aPropertyListWithQuickViewFacets[i] + '":"true",';
					}
					return sForceLinks.slice(0, -1) + '\\}'; //Example return value '\\{"ProductForEdit":"true"\\}'
				} else {
					return '\\{\\}';
				}
			},
			
			getVisualFilterVisibility: function(filterEntity){
				if(filterEntity["vui.bodc.SummaryFieldCharacteristic"] || filterEntity["vui.bodc.SummaryFieldKeyfigure"]){
					return true;
				}else{
					return false;
				}
			},
			
			getVisualFilterSwitchButtonKey: function(filterEntityName){
//				return "[{path: 'viewModel>/" + filterEntityName + "filterMode'}]";
				return "{parts: [{path: 'viewModel>/" + filterEntityName + "filterMode'}], formatter: 'zvui.work.controller.AnnotationHelper.fetchVisualFilterSwitchButtonKey'}";
			},
			
			fetchVisualFilterSwitchButtonKey: function(filterMode){
				return filterMode;
			},
			
			getCompactFilterVisibility: function(filterEntityName){
				return "{parts: [{path: 'viewModel>/" + filterEntityName + "filterMode'}], formatter: 'zvui.work.controller.AnnotationHelper.fetchCompactFilterVisibility'}";
			},
			
			fetchCompactFilterVisibility: function(filterMode){
				if(filterMode == "compact"){
					return true;
				}else{
					return false;
				}
			},
			
			getVisualFilterMode: function(filterEntityName){
				return "{parts: [{path: 'viewModel>/" + filterEntityName + "filterMode'}], formatter: 'zvui.work.controller.AnnotationHelper.fetchVisualFilterMode'}";
			},
			
			fetchVisualFilterMode: function(filterMode){
				if(filterMode == "visual"){
					return true;
				}else{
					return false;
				}
			},
			
			getSaveAsRunVisibility: function(oInterface, entityType){  // second column save as run button visibility
				var oMetaModel = oInterface.getModel();
				var functionImport = oMetaModel.getODataFunctionImport("SAVE_AS_RUN");
				if(functionImport){
					return "{parts: [{path: 'ui>/editable'}, {path: 'viewModel>/showDetailDetailClose'}], formatter: 'zvui.work.controller.AnnotationHelper.isSaveAsRunVisibility'}";
				}else{
					return false;
				}
			},
			
			isSaveAsRunVisibility: function(editable, detatildetailPage){
				if(editable && detatildetailPage){
					return true;
				}else{
					return false;
				}
			},
			
			getRootActionVisibility: function(oInterface, entityType, functionName){  // second column save as run button visibility
//				var oMetaModel = oInterface.getModel(0);
//				var functionImport = oMetaModel.getODataFunctionImport(functionName);
//				if(functionImport){
//					return "{parts: [{path: 'ui>/editable'}, {path: 'viewModel>/showDetailClose'}], formatter: 'zvui.work.controller.AnnotationHelper.isSubmitVisibility'}";
//				}else{
//					return false;
//				}
				return "{parts: [{value: '" + functionName.String + "'}, {path: 'viewModel>/navigationButtonsVisible'}, {path: 'viewModel>/modelChanged'}, {path: 'viewModel>/disp_only'}], formatter: 'zvui.work.controller.AnnotationHelper.isSubmitVisibility'}";
			},
			
			isSubmitVisibility: function(functionName, navigationButtonsVisible, modelChanged,disp_only){
				if(disp_only){
					return false;
				}
				if(functionName == "SAVE" || functionName == "SAVE_AS_RUN" || functionName == "SAVE_AND_REFRESH" || 
				   functionName == "SAV_RUN_N_REFR" || functionName == "SAVE_N_CLOSE" || functionName == "CNFRM_ADJ"){
					if(modelChanged){
						if(navigationButtonsVisible){
							return navigationButtonsVisible.indexOf(functionName) !== -1 ? true : false;
						}else{
							return true;
						}	
					}else{
						return false;
					}
				}else{
					if(modelChanged){
						return false;
					}else{
						if(navigationButtonsVisible){
							return navigationButtonsVisible.indexOf(functionName) !== -1 ? true : false;
						}else{
							return true;
						}	
					}	
				}								
										
			},
			getNavigationMessageStripText: function(oInterface, entityType){
				var field = {};
				field.Path = 'uittl';
				return sap.ui.model.odata.AnnotationHelper.format(oInterface, field);
			},
			
			getHyperlinkIconVisibility: function(oField){
				return "{parts: [{path: '"+ oField + "'}], formatter: 'zvui.work.controller.AnnotationHelper.showHyperlinkIcon'}";
			},
			showHyperlinkIcon: function(url){
				if(url){
					return true;
				}else{
					return false;
				}
			},
			getTableColumnVisibility: function(dataFieldValue,dataField){
				if(dataFieldValue["com.sap.vocabularies.UI.v1.Hidden"] ||
				   dataFieldValue["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember ==
					   "com.sap.vocabularies.Common.v1.FieldControlType/Hidden"){
					return false;
				}else{ 
					return true;
				}
			},
			showTablePersonalisation: function(oInterface, oEntitySet, oEntityType){
				var oFunctionImport = oInterface.getModel(0).getODataFunctionImport(oEntitySet.name+"_LYT_SET");
				if(oFunctionImport == null || oFunctionImport == undefined){
					return false;
				}else{
					return true;
				}
			},
			skipToolbarAction: function(action,entityset){
				if(action.String.indexOf(entityset.name + '_LYT_SET') !== -1){
					return false;
				}
				return true;
			},
			showHeaderControl: function(sEntityName, key){
				return "{parts:[{path: 'viewModel>/"+ sEntityName + "filterMode'},{value: '"+ key + "'}],formatter: 'zvui.work.controller.AnnotationHelper.getHeaderControlVisibility'}";
			},
			getHeaderControlVisibility: function(selectedKey, key){
				if((key == "compact" && (selectedKey == "compact" || selectedKey == "visual")) ||  (selectedKey == key && key == "snaphdr")){
					return true;
				}
				return false;
			},
			showVariantManagementControl: function(sEntityName, showSnappingHeader, control){
				if(control == "variantManage" && showSnappingHeader !== true){
					return true;
				}else if(showSnappingHeader){
					return "{parts:[{path: 'viewModel>/"+ sEntityName + "filterMode'},{value: '"+ control +"'}],formatter: 'zvui.work.controller.AnnotationHelper.getVariantManagementVisibility'}";
				}
				return false;				
			},
			getVariantManagementVisibility: function(selectedKey, control, currentPage, fromWorklist){
				if(control == "vbox"){
					return true;
				}else if(control == "vboxVariantManage" && selectedKey !== "snaphdr" && currentPage){
					return true;
				}else if(control == "vboxVariantManageSeparator" && selectedKey !== "snaphdr"){
					if(fromWorklist && currentPage){
						return true;
					}else{
						return false;
					}
				}
				return false;
			},
			getFlexicolumnButtonsVisiblity: function(showClose, showExpand, btnName){
				if(btnName == "collapse" && showExpand){
					return true;
				}else if(btnName == "expand" && !showExpand){
					return true;
				}else if(btnName == "close"){
					return true;
				}
				return false;
			},
			getMultiInputItemsValue: function(oInterface, entityType, fieldPath){
				oInterface = oInterface.getInterface(0);
				var findField = entityType.property.find(function(prop){ return prop.name == fieldPath.Path + "__u"}); 
				if(findField){
					var field = {};
					field.Path = findField.name;
                    return sap.ui.model.odata.AnnotationHelper.format(oInterface, field);			
				}else{
				    return sap.ui.model.odata.AnnotationHelper.format(oInterface, fieldPath);				
				}		
			},
			isWorkspaceFilterBlocked: function(variant){
				if(variant){
					return true;
				}
				return false;
			},
			checkDialogSectionEligibility: function(facetTarget,targetEntity){
				if(targetEntity){
					return facetTarget && facetTarget.AnnotationPath.indexOf(targetEntity) !== -1;
				}else{
					return facetTarget && facetTarget.AnnotationPath.indexOf('com.sap.vocabularies.UI.v1.Contacts') !== -1;
				}
			},
			formatValue: function(oInterface1, oEntityType, oDataField){
				var TargetEntitySet, oProperty, sResultPath;
				var oModel = oInterface1.getInterface(0).getModel();
				var oInterface = oInterface1.getInterface(0);
				if (oDataField.Value && oDataField.Value.Path) {
					oProperty = oModel.getODataProperty(oEntityType, oDataField.Value.Path) || {};
				}
				
				if(oDataField.NoOfDecimals || oProperty["sap:unit"]){
					if(oDataField.NoOfDecimals){
					    return "{parts:[{path: '" + oDataField.Value.Path + "'},{value: '"+ oDataField.NoOfDecimals.String + "'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
					}else{
						return "{parts:[{path: '" + oDataField.Value.Path + "'},{value: '2'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
					}
				}else if(oProperty && oProperty.type == "Edm.DateTime"){
//					return "{path:'" + oDataField.Value.Path + "',type:'sap.ui.model.odata.type.DateTime',constraints:{'displayFormat':'Date'}}";
					return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Value);
				}else{
//					return sap.ui.model.odata.AnnotationHelper.format(oInterface, dataField.Value);
					if (oDataField.Value && oDataField.Value.Path) {
						sResultPath = (oProperty["com.sap.vocabularies.Common.v1.Text"] || oDataField.Value).Path || "";
						var sTextArrangement;
						if (oProperty["com.sap.vocabularies.Common.v1.Text"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
							sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
									oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
							var sTextArrangementPath;
							switch (sTextArrangement) {
							case "idAndDescription":
								sTextArrangementPath = "{parts: [{path: '" + oDataField.Value.Path + "'} , {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							case "idOnly":
//								sTextArrangementPath = "{" + oDataField.Value.Path + "}";
								return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Value);
								break;
							case "descriptionOnly":
								if(oProperty["com.sap.vocabularies.Common.v1.Text"]){
									sTextArrangementPath = "{" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "}";
								}else{
//									sTextArrangementPath = "{" + oDataField.Value.Path + "}";					
									return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Value);
								}
								break;
							case "descriptionAndId":
								sTextArrangementPath = "{parts: [ {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'} , {path: '" + oDataField.Value.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							default:
//								sTextArrangementPath = "{" + sResultPath + "}";
								return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Value);
							break;
							}
							return sTextArrangementPath;
						}else{
//							return "{" + sResultPath + "}";
							return sap.ui.model.odata.AnnotationHelper.format(oInterface, oDataField.Value);
						}
					}
				}
			},
			thousands_separators: function(num){
			    var num_parts = num.toString().split(".");
			    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			    return num_parts.join(".");
			},
			formatDeimalValue: function(value, noOfDecimals){
				if(value){
					if(noOfDecimals !== undefined){
						noOfDecimals = parseInt(noOfDecimals);
						if(Number(value)){
							value = Number(value).toFixed(noOfDecimals);
						}else{
							return value;
						}
					}
					if(window.decimalNotation){
						switch (window.decimalNotation) {
						case "1,234,567.89":
							value = zvui.work.controller.AnnotationHelper.thousands_separators(value);
							break;
						case "1 234 567,89":
							value = zvui.work.controller.AnnotationHelper.thousands_separators(value);
							value = value.replace(".",",");
							break;
						case "1.234.567,89":
							value = zvui.work.controller.AnnotationHelper.thousands_separators(value);
							value = value.replace(".","$");
							value = value.replace(/,/g,".");
							value = value.replace("$",",");
							break;
						}
					}
				}
				return value;
			},
			formatNumericValue: function(value){
				if(value){
					return Number(value).toString()
				}
			},
			setEntityToMicroChart: function(entityName){
				return "{/" + entityName + "}";
			},
			setMicroChartCriticality: function(criticality){
				switch (criticality) {
				case "1":
					return "Error";
				case "2":
					return "Critical";
				case "3":
					return "Good";
				default:
					return "Neutral";
				}
			},
			setDeltaMicroChartDisplayValue: function(oInterface, entitySetName, fieldName){
				var oModel = oInterface.getInterface(0).getModel();
				var oEntitySet = oModel.getODataEntitySet(entitySetName);
				var oEntityType = oModel.getODataEntityType(oEntitySet.entityType);
				var oProperty = oModel.getODataProperty(oEntityType, fieldName.Path);
				if(oProperty["sap:unit"]){
					return "{parts:[{path: '" + fieldName.Path + "'}, {path: '" + oProperty["sap:unit"] + "'}],formatter: 'zvui.work.controller.AnnotationHelper.getDeltaMicroChartDisplayValue'}";
				}else{
					return sap.ui.model.odata.AnnotationHelper.format(oInterface, fieldName);
				}
			},
			getDeltaMicroChartDisplayValue: function(value, unit){
				return Number(value).toFixed(2) + " " + unit;
			},
			createP13NColumnForMQLFR: function (oEntityType) {
				//used by DataFieldForAction, DataFieldWithIntentBasedNavigation, DataFieldForIntentBasedNavigation
				var sColumnKey = "";
				var sFioriTemplatePrefix = "template";
				var sSeperator = "::";

				var index = 0;
				var lineItems;
				if(oEntityType["vui.bodc.NonResponsiveLineItem"]){
					lineItems = oEntityType["vui.bodc.NonResponsiveLineItem"];
				}else{
					lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}
				if(lineItems){
//					var lineItems = oEntityType["com.sap.vocabularies.UI.v1.LineItem"];
					for(var i = 0; i < lineItems.length ; i++ ){
						var oDataField = lineItems[i];
						if(oDataField && oDataField.Position && oDataField.Position.Int ){
							if(index < oDataField.Position.Int)
								index = oDataField.Position.Int;
						}
					}
				}
				index++;
				sColumnKey = sFioriTemplatePrefix + sSeperator + "MATCH" + sSeperator + "MQLFR";
				var sP13N = '\\{"columnKey":"' + sColumnKey +  '", "columnIndex":"' + index + '" \\}';
				return sP13N;
			},
			getSegmentButtonVisibility: function(flag1){
				return "{parts: [{path: 'viewModel>/showDetailClose'}, {value: '" + flag1 + "'}], formatter: 'zvui.work.controller.AnnotationHelper.setSegmentButtonVisibility'}";
			},
			setSegmentButtonVisibility: function(flag1, flag2){
				if(flag1 && flag2){
					return true;
				}else{
					return false;
				}
			},
			getHeaderContentVisibility: function(flag1){
				return "{parts: [{path: 'viewModel>/showDetailClose'}, {value: " + flag1 + "}], formatter: 'zvui.work.controller.AnnotationHelper.setHeaderContentVisibility'}";
			},
			setHeaderContentVisibility: function(flag1, flag2){
				if(flag1 || flag2){
					return true;
				}else{
					return false;
				}
			},
			getFooterVisibility: function(entityType, currentPage){
				return "{parts: [{path: 'message>/'}, {path: 'viewModel>/navigationButtonsVisible'}, {path: 'viewModel>/modelChanged'}, {path: 'viewModel>/disp_only'}, {value: '" + JSON.stringify(entityType["vui.bodc.workspace.RootActions"]) + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getDetailPageFooterVisibility'}";
			},
			getDetailPageFooterVisibility: function(messages, modelChanged, disp_only){				
				if(disp_only){
					return false;
				}else if(modelChanged){
					return true;
				}

				if(messages.length > 0){
					return true;
				}
//				if(navigationButtonsVisible){
//					var rootActions = JSON.parse(actions);
//					for(var i=0; i<rootActions.length; i++){
//						if(rootActions[i].Action.String !== "SAVE" && rootActions[i].Action.String !== "CANCEL" &&
//						   rootActions[i].Action.String !== "SAVE_AS_RUN" && rootActions[i].Action.String !== "SAV_RUN_N_REFR" &&
//						   rootActions[i].Action.String !== "SAVE_N_CLOSE"){
//							if(navigationButtonsVisible.indexOf(rootActions[i].Action.String) !== -1){
//								return true;
//							}
//						}
//					}				
//				}
				return false;
			},
//			setObjectStatusCriticality: function(criticality){
//				return "{path: '" + criticality.Path + "', formatter: 'zvui.work.controller.AnnotationHelper.setObjectStatusCriticality1'}";
//			},
			setObjectStatusCriticality: function(sValue){
				switch(sValue){
				case 0:
					return sap.ui.core.ValueState.None;
				case 1:
					return sap.ui.core.ValueState.Error;
				case 2:
					return sap.ui.core.ValueState.Warning;
				case 3:
					return sap.ui.core.ValueState.Success;
				case 4:
					return sap.ui.core.ValueState.Information;
				}
				return sap.ui.core.ValueState.None;
			},
			getChangeDateFormat: function(date){
				if(!date) return "";
				var format = "yMd";
				if(window.dateFormat){
					format = window.dateFormat;
				}
				var dateFormat = sap.ui.core.format.DateFormat.getInstance({
					format: "yMd",
					interval: false,
					UTC: true
				});
				var oDate = new Date(date);
				var formatedDate = dateFormat.format(oDate);
				var dateData = formatedDate.split('/');                
                var month = dateData[0].length == 1 ? "0" + dateData[0] : dateData[0];
                var day = dateData[1].length == 1 ? "0" + dateData[1] : dateData[1];
                var year = dateData[2];
                switch (format) {
                	case 'dd.MM.yyyy':
                	case 'DD.MM.YYYY':
                		formatedDate = day + "." + month + "." + year;
                		break;                	
                	case 'MM-dd-yyyy':
                	case 'MM-DD-YYYY':
                		formatedDate = month + "-" + day + "-" + year;
               		 break;
                	case 'yyyy.MM.dd':
                	case 'YYYY.MM.DD':
                		formatedDate = year + "." + month + "." + day;
               		 break;
                	case 'yyyy/MM/dd':
                	case 'YYYY/MM/DD':
                		formatedDate = year + "/" + month + "/" + day;
               		 break;
                	case 'yyyy-MM-dd':
                	case 'YYYY-MM-DD':
                		formatedDate = year + "-" + month + "-" + day;
               		 break;
                }
                
				return formatedDate;
			},
			getDetailFooterMessageButtonVisibility: function(messages, showDetailClose){
				if(messages.length > 0 && showDetailClose){
					return true;
				}else{
					return false;
				}
			},
			getDetailDetailFooterMessageButtonVisibility: function(messages, showDetailDetailClose){
				if(messages.length > 0 && showDetailDetailClose){
					return true;
				}else{
					return false;
				}
			},
			getFooterMessageButtonText: function(messages){
				if(messages.length > 0){
					return messages.length; 
				}else{
					return "";
				}
			},
			getAddressDataFieldValue: function(oDataFieldValue) {
//				if (oDataFieldValue && !oDataFieldValue.Path && !oDataFieldValue.Apply && !oDataFieldValue.String) {
//					return "";
				return "{parts: [{path: '" + oDataFieldValue.Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.setAddressDataFieldValue'}";
			},
			setAddressDataFieldValue: function(value){
				return value.replace(new RegExp("/n","g"), "\n");
			},
			getChangeLogTimeAndDate: function(changeDate, changedTime){
				var dateFormat = sap.ui.core.format.DateFormat.getInstance({
					format: "yMMMd",
					interval: false
				});
				var oDate = new Date(changeDate);
				var formatedDate = dateFormat.format(oDate);
				
				var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({
					format: "Hms",
				});
				var oTime = new Date(changedTime);
				var formatedTime = timeFormat.format(oTime);
				
				return formatedDate + "  " + formatedTime;
			},
			getDSCCorrectionLinesVisiblity: function(display){
				return true;
			},
			formatDecimalField: function(value, unit, decimals){
				var fomatedValue;
				if(Number(value)){
					fomatedValue = zvui.work.controller.AnnotationHelper.formatDeimalValue(value,decimals);
				}else{
					fomatedValue = value;
				}
				if(unit){
					return fomatedValue + " " + unit;					
				}else{
					if(fomatedValue){
						return fomatedValue.toString();
					}else{
						return "";
					}	
				}
			}
	};

	zvui.work.controller.AnnotationHelper = oAnnotationHelper;
	zvui.work.controller.AnnotationHelper.getLinkTextForDFwithIBN.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getLabelForDFwithIBN.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.isPropertySemanticKey.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getRepeatIndex.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.suppressP13NDuplicateColumns.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatWithExpand.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatWithExpandSimple.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getNavigationPathWithExpand.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getFormGroupBindingString.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getCurrentPathWithExpand.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getCurrentPathWithExpandForContact.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getEntityTypesForFormPersonalization.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.actionControl.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getTextArrangementForSmartControl.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.matchesBreadCrumb.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13N.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getSortProperty.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13NColumnForConnectedFields.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13NColumnForIndicator.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13NColumnForAction.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13NColumnForContactPopUp.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.createP13NColumnForChart.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.hasDeterminingActionsRespectingApplicablePath.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.buildExpressionForProgressIndicatorPercentValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.buildExpressionForProgressIndicatorDisplayValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.buildExpressionForProgressIndicatorCriticality.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getEditActionButtonVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getBulkEditButtonVisibility.requiresIContext = true;
//	zvui.work.controller.AnnotationHelper.getGridFieldContextEditability.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getDeleteActionButtonVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getSubObjPageDeleteActionButtonVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.isRelatedEntityCreatable.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.buildBreadCrumbExpression.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getApplicablePathForChartToolbarActions.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.buildAnnotatedActionButtonEnablementExpression.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getIconTabFilterText.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatImageUrl.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getPathWithExpandFromHeader.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatImageOrTypeUrl.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatHeaderImage.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getDataFieldLabel.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getDataFieldValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getUnitFieldValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getMultiInputItemsValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getNavigationMessageStripText.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getUnitFieldDisplay.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getUnitFieldWidth.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getUnitFieldChangeFC.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getSmartTableRowActionCount.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.showRowLevelFilterButton.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getActionButtonVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.checkMultiplicityForDataFieldAssociation.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.checkMultiplicityForDataFieldAssociationST.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getTextArrangementForSCFields.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.hasQuickViewFacet.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getSaveAsRunVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.getRootActionVisibility.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.showTablePersonalisation.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.setChartBindingPath.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.formatValue.requiresIContext = true;
	zvui.work.controller.AnnotationHelper.setDeltaMicroChartDisplayValue.requiresIContext = true;
})();