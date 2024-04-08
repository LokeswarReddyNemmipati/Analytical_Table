/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/ui/model/odata/AnnotationHelper"
], function(AnnotationHelper) {
	"use strict";

	// @see sap.ui.core.ID.type: [A-Za-z_][-A-Za-z0-9_.:]*
	// Note: "-" is somehow reserved for composition
	var rBadIdChars = /[^A-Za-z0-9_.:]/g;

	/**
	 * Custom formatter function for complex bindings to demonstrate access to ith part of binding.
	 * Delegates to {@link sap.ui.model.odata.AnnotationHelper#format} and wraps label texts in
	 * square brackets. Joins parts together, separated by a space.
	 *
	 * @param {sap.ui.core.util.XMLPreprocessor.IContext|sap.ui.model.Context} oInterface
	 *   the callback interface related to the current formatter call
	 * @param {...any} [vRawValue]
	 *   the raw value(s) from the meta model
	 * @returns {string}
	 *   the resulting string value to write into the processed XML
	 */
	function formatParts(oInterface, vRawValue) {
		var i, aResult;

		/*
		 * Delegates to {@link sap.ui.model.odata.AnnotationHelper#format} and wraps label texts
		 * in square brackets.
		 *
		 * @param {sap.ui.model.Context} oInterface
		 *   the callback interface related to the current formatter call
		 * @param {any} [vRawValue0]
		 *   the raw value from the meta model
		 * @returns {string}
		 */
		function formatLabelValue(oInterface, vRawValue0) {
			var sResult = AnnotationHelper.format(oInterface, vRawValue0);
			return oInterface.getPath().endsWith("/Label") ? "[" + sResult + "]" : sResult;
		}

		try {
			if (oInterface.getModel()) {
				return formatLabelValue(oInterface, vRawValue);
			} else {
				// root formatter for a composite binding
				aResult = [];
				// "probe for the smallest non-negative integer"
				for (i = 0; oInterface.getModel(i); i += 1) {
					aResult.push(
						// Note: arguments[i + 1] is the raw value of the ith part!
						formatLabelValue(oInterface.getInterface(i), arguments[i + 1])
					);
				}
				return aResult.join(" ");
			}
		} catch (e) {
			return e.message;
		}
	}
	formatParts.requiresIContext = true;

	/**
	 * Custom formatter function to compute an unstable ID from the given interface's path(s).
	 *
	 * @param {sap.ui.core.util.XMLPreprocessor.IContext} oInterface
	 *   the callback interface related to the current formatter call
	 * @returns {string}
	 *   the resulting ID string value to write into the processed XML
	 */

	function getTextForDataField(oDataFieldValue) {
		var sValue = oDataFieldValue["com.sap.vocabularies.Common.v1.Text"] && oDataFieldValue["com.sap.vocabularies.Common.v1.Text"].Path;
		return sValue;
	}

	function _mapTextArrangement4smartControl(sTextArrangementIn) {
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
	}

	function getTextArrangement(oEntityType, oField) {
		var sTextArrangement;
		// 1. check TextArrangement definition for property directly - has prio 1
		if (oField["com.sap.vocabularies.UI.v1.TextArrangement"] && oField["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
			sTextArrangement = _mapTextArrangement4smartControl(oField["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
		}
		// 2. check TextArrangement definition under property/text - has prio 2
		if (!sTextArrangement) {
			var oPropertyTextModel = oField["com.sap.vocabularies.Common.v1.Text"];
			if (oPropertyTextModel && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"] && oPropertyTextModel[
					"com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
				sTextArrangement = _mapTextArrangement4smartControl(oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
			}
		}
		// 3. check TextArrangement definition for entity type
		if (!sTextArrangement) {
			if (oEntityType && oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"] && oEntityType[
					"com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
				sTextArrangement = _mapTextArrangement4smartControl(oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
			}
		}
		if (!sTextArrangement) { //coming from the title should get a readable description and underneath is the id - the default
			sTextArrangement = "descriptionAndId";
		}
		return sTextArrangement;
	}

	function formatDateTimeForCustomColumn(oDataFieldValueType, sResult) {
		if (oDataFieldValueType === "Edm.DateTimeOffset") {
			return "{ path: '" + sResult +
				"', type: 'sap.ui.model.odata.type.DateTimeOffset', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else if (oDataFieldValueType === "Edm.DateTime") {
			return "{ path: '" + sResult +
				"', type: 'sap.ui.model.odata.type.DateTime', formatOptions: { style: 'medium'}, constraints: {displayFormat: 'Date'}}";
		} else {
			return "{ path: '" + sResult + "', type: 'sap.ui.model.odata.type.Time', formatOptions: { style: 'medium'}}";
		}
	}

	function getTitlePath(oDataFieldValue, oDataField, oEntityType) {
		var sResult, sTextArrangement;
		sTextArrangement = getTextArrangement(oEntityType, oDataFieldValue);
		switch (sTextArrangement) {
			case "idOnly":
			case "descriptionOnly":
				break;
			case "idAndDescription":
				// if the Value.Path does not exist the v1.Text has been used as the first text already
				if (!oDataField.Value.Path) {
					break;
				}
				sResult = getTextForDataField(oDataFieldValue);
				break;
			case "descriptionAndId":
			default:
				// if this text does not exist oDataField.Value.Path has been already used as the first text so it should not be set as the second text again
				if (!getTextForDataField(oDataFieldValue)) {
					break;
				}
				// if no text arrangement annotation is maintained the second text should be oDataField.Value.Path if available
				sResult = oDataField.Value.Path;
				break;
		}
		return sResult;
	}

	function checkFacetContent(oFacetContext, bBlock) {
		var sPath;
		var oInterface = oFacetContext.getInterface(0);
		var aFacets = oFacetContext.getModel().getProperty("", oFacetContext);

		//for Reference Facets directly under UI-Facets we need to check facets one level higher - by removing the last part of the path
		var aForPathOfFacetOneLevelHigher = oFacetContext.getPath().split("/Facets");
		var sContextOfFacetOneLevelHigher = oInterface.getModel().getContext(aForPathOfFacetOneLevelHigher[0]);
		if (oInterface.getModel().getProperty('', sContextOfFacetOneLevelHigher).RecordType === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
			return sContextOfFacetOneLevelHigher.getPath();
		} else {
			if (!aFacets) {
				return;
			}

			for (var iFacet = 0; iFacet < aFacets.length; iFacet++) {
				if (!bBlock) {
					if (aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"] && aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool ===
						"false") {
						sPath = oInterface.getPath() + "/" + iFacet;
						break;
					}
				} else {
					if (aFacets[iFacet].RecordType !== "com.sap.vocabularies.UI.v1.ReferenceFacet" || (!aFacets[iFacet][
							"com.sap.vocabularies.UI.v1.PartOfPreview"
						] || aFacets[iFacet]["com.sap.vocabularies.UI.v1.PartOfPreview"].Bool === "true")) {
						sPath = oInterface.getPath() + "/" + iFacet;
						break;
					}
				}
			}
		}
		return sPath;
	}

	function checkMoreBlockContent(oFacetContext) {
		return checkFacetContent(oFacetContext, false);
	}

	function checkBlockContent(oFacetContext) {
		return checkFacetContent(oFacetContext, true);
	}

	function getColumnHeaderText(oDataFieldValue, oDataField) {
		var sResult;
		if (oDataField.Label) {
			return oDataField.Label.String;
		} else {
			sResult = oDataFieldValue["sap:label"] || (oDataFieldValue["com.sap.vocabularies.Common.v1.Label"] || "").String || "";
			return sResult;
		}
	}

	function getColumnCellSecondText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility) {
		var sResult;
		sResult = getTitlePath(oDataFieldValue, oDataField, oEntityType);

		if (sResult) {
			if (bCheckVisibility) {
				return true;
			} else {
				if (oDataFieldValue.type === "Edm.DateTimeOffset" || oDataFieldValue.type === "Edm.DateTime" || oDataFieldValue.type === "Edm.Time") {
					var sFormattedDateTime = formatDateTimeForCustomColumn(oDataFieldValue.type, sResult);
					return sFormattedDateTime;
				} else {
					return "{" + sResult + "}";
				}
			}
		}
	}

	function getColumnCellSecondTextVisibility(oDataFieldValue, oDataField, oEntityType) {
		var bCheckVisibility = true;
		var bVisible = !!getColumnCellSecondText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility);
		return bVisible;
	}

	function getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility) {
		var sResult, sTextArrangement;
		sTextArrangement = getTextArrangement(oEntityType, oDataFieldValue);
		switch (sTextArrangement) {
			case "idAndDescription":
				sResult = oDataField.Value.Path;
				if (!sResult) {
					sResult = getTextForDataField(oDataFieldValue);
				}
				break;
			case "idOnly":
				sResult = oDataField.Value.Path;
				if (!sResult) {
					sResult = getTextForDataField(oDataFieldValue);
				}
				break;
			case "descriptionAndId":
			case "descriptionOnly":
			default:
				sResult = getTextForDataField(oDataFieldValue);
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
					var sFormattedDateTime = formatDateTimeForCustomColumn(oDataFieldValue.type, sResult);
					return sFormattedDateTime;
				} else {
					return "{" + sResult + "}";
				}
			}
		}
	}

	function getColumnCellFirstTextVisibility(oDataFieldValue, oDataField, oEntityType) {
		var bCheckVisibility = true;
		var bVisible = !!getColumnCellFirstText(oDataFieldValue, oDataField, oEntityType, bCheckVisibility);
		return bVisible;
	}

	function id(oInterface) {
		var i,
			sPath = oInterface.getPath(),
			aResult;

		if (sPath) {
			var sPath1 = sPath.replace(rBadIdChars, ".");
			if(sPath1.charAt(0) == '.'){
				sPath1 = sPath1.slice(1);
			}
			return sPath1; 
		} else {
			aResult = [];
			// "probe for the smallest non-negative integer"
			for (i = 0; oInterface.getPath(i); i += 1) {
				aResult.push(oInterface.getPath(i).replace(rBadIdChars, "."));
			}
			return aResult.join("::");
		}
	}
	id.requiresIContext = true;

	return {
		formatParts: formatParts,
		id: id
	};
}, /* bExport= */ true);