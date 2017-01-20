module.exports = function (UserCredential) {

  // <editor-fold desc="Methods for the REST API">
  // method for validation on all remote methods
  UserCredential.beforeRemote("**", function (context, unused, next) {
    // additional setup to make sure that user doesn't tamper with arguments
    context.args.data.id = undefined

    next()
  })

  UserCredential.beforeRemote("create", function (context, unused, next) {
    context.args.data.created = undefined

    next()
  })

  // </editor-fold>
}
