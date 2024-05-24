angular.module(
  'app', [
    'ui.bootstrap',
    'mx.checkout'
  ]
);

angular.module('app').config(function(mxCheckoutProvider) {
    mxCheckoutProvider.options({

    })
  }
);

angular.module('app').controller('Demo', function($scope) {
  $scope.checkoutOptions = {
    panelClass: 'panel-default',
    alertDangerClass: 'alert-danger',
    formControlClass: 'form-control',
    btnClass: 'btn-success',
    tooltipClass: '',

    active: 'ibank',
    tabs: ['card', 'ibank'],
    ibank: ['p24', 'plotva24'],
    params: {
      test: 'test'
    }
  };

  $scope.error = function(response){
    console.log(response)
  };

  $scope.success = function(response){
    console.log(response)
  };
});