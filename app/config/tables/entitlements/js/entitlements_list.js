'use strict';

var LOG_TAG = 'entitlements_list: ';

var idxStart = -1;
var actionTypeKey = "actionTypeKey";
var deliveryTableKey = "deliveryTableKey";
var actionAddCustomDelivery = 0;
var entitlementsResultSet = {};
var locale = odkCommon.getPreferredLocale();
var savepointSuccess = "COMPLETE";
var entitlementStatus = util.getQueryParameter('entitlement_status');


var firstLoad = function() {
    odkCommon.registerListener(function() {
        actionCBFn();
    });
    actionCBFn();
    resumeFn(0);
};

var resumeFn = function(fIdxStart) {
    var entitlementsResultSet = null;
    dataUtil.getViewData().then( function(result) {
        entitlementsResultSet = result;

        idxStart = fIdxStart;
        console.log('I', LOG_TAG + 'resumeFn called. idxStart: ' + idxStart);
        // The first time through we're going to make a map of typeId to
        // typeName so that we can display the name of each shop's specialty.
        if (idxStart === 0) {
            // We're also going to add a click listener on the wrapper ul that will
            // handle all of the clicks on its children.
            $('#list').click(function(e) {
                // We set the rowId while as the li id. However, we may have
                // clicked on the li or anything in the li. Thus we need to get
                // the original li, which we'll do with jQuery's closest()
                // method. First, however, we need to wrap up the target
                // element in a jquery object.
                // wrap up the object so we can call closest()
                var jqueryObject = $(e.target);
                // we want the closest thing with class item_space, which we
                // have set up to have the row id
                var containingDiv = jqueryObject.closest('.item_space');
                var rowId = containingDiv.attr('rowId');
                console.log('I', LOG_TAG + 'clicked with rowId: ' + rowId);
                // make sure we retrieved the rowId
                if (rowId !== null && rowId !== undefined) {
                    if (entitlementStatus == 'delivered') {
                        launchDeliveryDetailView(rowId);
                    } else if (entitlementStatus == 'pending') {
                        dataUtil.triggerEntitlementDelivery(rowId, actionAddCustomDelivery);
                    }
                }
            });
        }

        displayGroup(idxStart, result);
    }).catch( function(reason) {
        console.log('E', LOG_TAG +  LOG_TAG + "Failed to get view data: " + reason);
    });
}


var launchDeliveryDetailView = function(entitlement_id) {
    console.log('I', LOG_TAG + "Launching delivery detail view for entitlement: " + entitlement_id);

    new Promise(function(resolve, reject) {
        odkData.query(util.deliveryTable, 'entitlement_id = ?', [entitlement_id], null,
            null, null, null, null, null, true, resolve, reject);
    }).then(function(result) {
        if (result.getCount() > 0) {
            odkTables.openDetailView(null, 'deliveries', result.getData(0, "_id"),
                'config/tables/deliveries/html/deliveries_detail.html')
        }
    }).catch(function(reason) {
        console.log('E', LOG_TAG + "Failed to retrieve delivery: " + reason);
    });
}


/************************** Action callback workflow *********************************/

var actionCBFn = function() {
    var action = odkCommon.viewFirstQueuedAction();
    console.log('E', LOG_TAG + 'callback entered with action: ' + action);

    if (action === null || action === undefined) {
        // The queue is empty
        return;
    }

    var dispatchStr = JSON.parse(action.dispatchStruct);
    if (dispatchStr === null || dispatchStr === undefined) {
        console.log('E', LOG_TAG + 'Error: missing dispatch strct');
        return;
    }

    var actionType = dispatchStr[actionTypeKey];
    switch (actionType) {
        case actionAddCustomDelivery:
            finishCustomDelivery(action, dispatchStr);
            break;
        default:
            console.log('E', LOG_TAG + "Error: unrecognized action type in callback");
    }


}

var finishCustomDelivery = function(action, dispatchStr) {
    if (dataUtil.validateCustomTableEntry(action, dispatchStr, "delivery", util.deliveryTable)) {
        // TODO: check to make sure that there are any entitlements left, otherwise return to previous screen
    }
}

/************************** UI Rending functions *********************************/

var displayGroup = function(idxStart, entitlementsResultSet) {
    console.log('I', LOG_TAG + 'displayGroup called. idxStart: ' + idxStart);

    /* If the list comes back empty, inform the user */
    if (entitlementsResultSet.getCount() === 0) {
        var errorText = $('#error');
        errorText.show();
        errorText.text('No entitlements found');
    }

    /* Number of rows displayed per 'chunk' - can modify this value */
    var chunk = 50;
    for (var i = idxStart; i < idxStart + chunk; i++) {
        if (i >= entitlementsResultSet.getCount()) {
            break;
        }

        var item = $('<li>');
        item.attr('rowId', entitlementsResultSet.getRowId(i));
        item.attr('class', 'item_space');
        item.attr('id', entitlementsResultSet.getRowId(i));
        var auth_name = entitlementsResultSet.getData(i, 'item_pack_name');
        item.text(auth_name);

        var item2 = $('<li>');
        item2.attr('class', 'detail');
        var ipn = entitlementsResultSet.getData(i, 'authorization_name');
        item2.text(ipn);

        /* Creates arrow icon (Nothing to edit here) */
        var chevron = $('<img>');
        chevron.attr('src', odkCommon.getFileAsUrl('config/assets/img/little_arrow.png'));
        chevron.attr('class', 'chevron');
        item.append(chevron);
        item.append(item2);

        $('#list').append(item);

        // don't append the last one to avoid the fencepost problem
        var borderDiv = $('<div>');
        borderDiv.addClass('divider');
        $('#list').append(borderDiv);

    }
    if (i < entitlementsResultSet.getCount()) {
        setTimeout(resumeFn, 0, i);
    }
};
