define(function(require,exports,module){"use strict";var ExtensionManager=brackets.getModule("extensibility/ExtensionManager"),_=brackets.getModule("thirdparty/lodash");function getUserExtensionsPresentInRegistry(extensions){var userInstalledExtensions=[];_.forEach(extensions,function(extension,extensionId){if(extension&&extension.installInfo&&extension.installInfo.locationType==="user"&&extension.registryInfo){userInstalledExtensions.push({name:extensionId,version:extension.installInfo.metadata.version})}});return userInstalledExtensions}function getUserInstalledExtensions(){var result=new $.Deferred;if(!ExtensionManager.isRegistryObjectUpdated){ExtensionManager.downloadRegistry().done(function(){result.resolve(getUserExtensionsPresentInRegistry(ExtensionManager.extensions))}).fail(function(){result.resolve([])})}else{result.resolve(getUserExtensionsPresentInRegistry(ExtensionManager.extensions))}return result.promise()}exports.getUserInstalledExtensions=getUserInstalledExtensions});