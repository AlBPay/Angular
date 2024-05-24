angular
  .module('mx.checkout')
  .directive('mxCheckout', function(mxCheckout) {
    return {
      restrict: 'A',
      templateUrl: 'mx/template/checkout/checkout.html',
      transclude: true,
      scope: {
        mxCheckoutOptions: '=?',
        onError: '&',
        onSuccess: '&'
      },
      controller: mxCheckout.controller
    };
  })
  .directive('mxCheckoutField', function(mxCheckout) {
    return {
      require: '^^mxCheckout',
      restrict: 'A',
      scope: {
        name: '@',
        value: '@'
      },
      link: function(scope, element, attrs, checkoutCtrl) {
        checkoutCtrl.addParams(scope);
      }
    };
  })
  .directive('mxFieldInput', function() {
    return {
      restrict: 'A',
      replace: true,
      templateUrl: 'mx/template/checkout/field-input.html',
      scope: {
        model: '=mxFieldInput',
        config: '=',
        blur: '&',
        focus: '&'
      }
    };
  })
  .directive('mxAutoFocus', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        scope.$watch(
          attrs.mxAutoFocus,
          function(val) {
            if (angular.isDefined(val) && val) {
              $timeout(function() {
                element[0].focus();
              });
            }
          },
          true
        );
      }
    };
  })
  .directive('mxFieldValid', function(mxValidation, mxCheckoutConfig) {
    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        valid: '=mxFieldValid',
        config: '=',
        model: '='
      },
      link: function(scope, element, attrs, ngModel) {
        if (scope.config.valid) {
          angular.forEach(scope.config.valid.split(','), function(valid) {
            // валидируем при инициализации
            // console.log('init ' + ngModel.$name + ' ' + valid)
            validate(
              valid,
              scope.model[scope.config.id], //ngModel.$modelValue,
              scope.model[scope.config.bind],
              setError
            );

            // когда поле валидно убираем tooltip
            scope.$watch(
              function() {
                return ngModel.$modelValue;
              },
              function(value) {
                if (ngModel.$valid) {
                  scope.valid.errorText[ngModel.$name] = '';
                }
              },
              true
            );

            //view -> model
            ngModel.$parsers.push(function(value) {
              // console.log('$parsers ' + ngModel.$name + ' ' + valid)
              validate(valid, value, scope.model[scope.config.bind], setError);
              return value;
            });
          });
        }

        if (scope.config.bind) {
          attrs.$observe('bind', function(value) {
            // console.log('$observe ' + scope.config.bind + ' exp_date')
            validate('exp_date', ngModel.$modelValue, value, function(result, valid) {
              ngModel.$setValidity(valid, result);
            });
          });
        }

        function validate(valid, value, bind, cb) {
          mxValidation.validate(
            {
              value: value,
              config: scope.config,
              bind: bind
            },
            valid,
            cb
          );
        }

        function setError(result, valid) {
          if (result) {
            scope.valid.iconShow[scope.config.bind] = false;
          } else {
            scope.valid.errorText[ngModel.$name] = mxCheckoutConfig.error[valid];
          }
          ngModel.$setValidity(valid, result);
        }
      }
    };
  });
