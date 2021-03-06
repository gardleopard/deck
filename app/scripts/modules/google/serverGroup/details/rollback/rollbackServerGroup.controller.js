'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.google.serverGroup.details.rollback.controller', [
      require('../../../../core/account/account.service.js'),
      require('../../../../core/application/modal/platformHealthOverride.directive.js'),
      require('../../../../core/serverGroup/serverGroup.write.service.js'),
      require('../../../../core/task/monitor/taskMonitorService.js'),
    ])
    .controller('gceRollbackServerGroupCtrl', function ($scope, $modalInstance, accountService, serverGroupWriter,
                                                        taskMonitorService,
                                                        application, serverGroup, disabledServerGroups) {
      $scope.serverGroup = serverGroup;
      $scope.disabledServerGroups = disabledServerGroups.sort((a, b) => b.name.localeCompare(a.name));
      $scope.verification = {
        required: accountService.challengeDestructiveActions('gce', serverGroup.account)
      };

      $scope.command = {
        rollbackType: 'EXPLICIT',
        rollbackContext: {
          rollbackServerGroupName: serverGroup.name
        },
        zone: serverGroup.zones[0],
      };

      if (application && application.attributes) {
        $scope.command.platformHealthOnlyShowOverride = application.attributes.platformHealthOnlyShowOverride;
      }

      this.isValid = function () {
        var command = $scope.command;
        if ($scope.verification.required && $scope.verification.verifyAccount !== serverGroup.account.toUpperCase()) {
          return false;
        }

        return command.rollbackContext.restoreServerGroupName !== undefined;
      };

      this.rollback = function () {
        if (!this.isValid()) {
          return;
        }

        var submitMethod = function () {
          return serverGroupWriter.rollbackServerGroup(serverGroup, application, $scope.command);
        };

        var taskMonitorConfig = {
          modalInstance: $modalInstance,
          application: application,
          title: 'Rollback ' + serverGroup.name,
        };

        $scope.taskMonitor = taskMonitorService.buildTaskMonitor(taskMonitorConfig);

        $scope.taskMonitor.submit(submitMethod);
      };

      this.cancel = function () {
        $modalInstance.dismiss();
      };
    });
