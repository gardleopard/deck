'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.serverGroup.configure.cf.servicesSelector', [
    ])
    .directive('cfServerGroupServicesSelector', function() {
      return {
        restrict: 'E',
        scope: {
          command: '=',
          application: '=',
          hideClusterNamePreview: '=',
        },
        templateUrl: require('./serverGroupServicesDirective.html'),
        controller: 'cfServerGroupServicesSelectorCtrl as servicesCtrl',
      };
    })
    .controller('cfServerGroupServicesSelectorCtrl', function($scope, $controller, rx, imageReader, namingService, $uibModalStack, $state) {

      this.addService = function() {
        $scope.command.services.push('');
      };

      this.removeService = function(index) {
        $scope.command.services.splice(index, 1);
      };

      this.getApplication = function() {
        var command = $scope.command;
        return command.application;
      };

    });
