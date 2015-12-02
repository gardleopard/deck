'use strict';

const angular = require('angular');

module.exports = angular
  .module('spinnaker.netflix.templateOverride.templateOverrides', [
    require('config'),
    require('../../core/overrideRegistry/override.registry.js'),
  ])
  .run(function(overrideRegistry, featureFlagConfig) {
    if (featureFlagConfig.get('netflixMode')) {
      let templates = [
        { key: 'applicationConfigView', value: require('../application/applicationConfig.html') },
        { key: 'applicationAttributesDirective', value: require('../application/applicationAttributes.directive.html') },
        { key: 'createApplicationModal', value: require('../application/createApplication.modal.html') },
        { key: 'editApplicationModal', value: require('../application/editApplication.modal.html') },
        { key: 'applicationNavHeader', value: require('../application/applicationNav.html') },
        { key: 'pipelineConfigActions', value: require('./pipelineConfigActions.html') },
        { key: 'spinnakerHeader', value: require('./spinnakerHeader.html') },
        { key: 'aws.serverGroup.securityGroups', value: require('../serverGroup/awsServerGroupSecurityGroups.html') },
        { key: 'aws.serverGroup.capacity', value: require('../serverGroup/awsServerGroupSecurityGroups.html') },
        { key: 'aws.resize.modal', value: require('../serverGroup/resize/awsResizeServerGroup.html') },
      ];
      templates.forEach((template) => overrideRegistry.overrideTemplate(template.key, template.value));

      let controllers = [
        { key: 'CreateApplicationModalCtrl', value: 'netflixCreateApplicationModalCtrl' }
      ];
      controllers.forEach((ctrl) => overrideRegistry.overrideController(ctrl.key, ctrl.value));
    }
  });
