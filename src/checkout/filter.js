angular.module('mx.checkout').filter('trusted', function($sce) {
  return function(url) {
    return $sce.trustAsResourceUrl(url);
  };
});
