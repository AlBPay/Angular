angular.module(
  'app', [
    'ngAnimate',
    'ui.bootstrap',
    'mx.checkout'
  ]
);

angular.module('app').config(function(mxCheckoutProvider) {
    mxCheckoutProvider.options({
      panelClass: 'panel-default',
      alertDangerClass: 'alert-danger',
      formControlClass: 'form-control',
      btnClass: 'btn-success',
      tooltipClass: ''
    })
  }
);

angular.module('app').controller('Demo', function($scope) {
  $scope.error = function(response){
    console.log(response)
  };

  $scope.success = function(response){
    console.log(response)
  };
});