define(["dojo/_base/declare",
    "dojo/_base/lang"
  ],
  function(declare, lang) {

    return declare(null, {

      allowArcGISOnline: true,
      arcgisOnlinePortal: null,
      orgId: null,
      portal: null,
      username: null,

      constructor: function(args) {
        lang.mixin(this, args);
      }

    });

  });