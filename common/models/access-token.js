/**
 * Created by mike on 4/10/16.
 */

"use strict"

module.exports = function(AccessToken) {

  // <editor-fold desc="Methods for the REST API">
  // method for validation on all remote methods
  AccessToken.beforeRemote("**", function(context, unused, next) {
    // additional setup to make sure that user doesn't tamper with arguments
    context.args.data.id = undefined

    next()
  })

  AccessToken.beforeRemote("create", function(context, unused, next) {
    context.args.data.created = undefined

    next()
  })

  // </editor-fold>
}
