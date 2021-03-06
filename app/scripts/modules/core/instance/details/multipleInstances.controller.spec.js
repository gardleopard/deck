'use strict';


describe('Controller: MultipleInstances', function () {

  var controller;
  var scope;
  var rx;
  var refreshStream;
  var ClusterFilterModel;

  beforeEach(
    window.module(
      require('./multipleInstances.controller')
    )
  );

  beforeEach(
    window.inject(function ($rootScope, $controller, _$q_, _rx_, _ClusterFilterModel_) {
      scope = $rootScope.$new();
      ClusterFilterModel = _ClusterFilterModel_;
      rx = _rx_;
      refreshStream = new rx.Subject();

      this.createController = function (application) {
        application.autoRefreshStream = application.autoRefreshStream || refreshStream;
        controller = $controller('MultipleInstancesCtrl', {
          $scope: scope,
          app: application,
        });
      };
    })
  );

  beforeEach(function () {
    this.serverGroupA = { type: 'aws', name: 'asg-v001', account: 'prod', region: 'us-east-1', instances: [
      { id: 'i-123', availabilityZone: 'c', launchTime: 1, healthState: 'Up', health: []},
      { id: 'i-234', availabilityZone: 'd', launchTime: 2, healthState: 'Up', health: []}
    ]
    };
    this.serverGroupB = { type: 'gce', name: 'asg-v002', account: 'test', region: 'us-west-1', instances: [
      { id: 'g-234', availabilityZone: 'e', launchTime: 2, healthState: 'Up', health: []}
    ]};
    this.serverGroupC = { type: 'gce', name: 'asg-v003', account: 'test', region: 'us-west-1', instances: [
      { id: 'g-234', availabilityZone: 'f', launchTime: 2, healthState: 'Up', health: []}
    ]};

    this.getInstanceGroup = (serverGroup) => {
      return ClusterFilterModel.getOrCreateMultiselectInstanceGroup(serverGroup);
    };

    this.addInstance = (serverGroup, instanceId) => {
      let instanceGroup = this.getInstanceGroup(serverGroup);
      instanceGroup.instanceIds.push(instanceId);
    };
  });

  describe('instance retrieval', function () {

    it('gets details for each selected instance and maps it to instanceGroup', function () {
      this.addInstance(this.serverGroupA, 'i-234');
      this.addInstance(this.serverGroupB, 'g-234');
      // no instances
      this.getInstanceGroup(this.serverGroupC);
      this.createController({ serverGroups: [this.serverGroupA, this.serverGroupB, this.serverGroupC]});

      expect(ClusterFilterModel.multiselectInstanceGroups.length).toBe(3);
      expect(controller.selectedGroups.length).toBe(2);

      let groupA = controller.selectedGroups[0],
          groupB = controller.selectedGroups[1];

      expect(groupA.instances.length).toBe(1);
      expect(groupA.serverGroup).toBe('asg-v001');

      expect(groupB.instances.length).toBe(1);
      expect(groupB.serverGroup).toBe('asg-v002');

      expect(controller.instancesCount).toBe(2);
    });

    it('re-retrieves instances when application refreshes', function () {
      let application = { serverGroups: [this.serverGroupA, this.serverGroupB, this.serverGroupC]};
      this.addInstance(this.serverGroupA, 'i-234');
      this.createController(application);

      expect(controller.selectedGroups.length).toBe(1);
      expect(controller.selectedGroups[0].instances[0].healthState).toBe('Up');

      this.serverGroupA.instances[1].healthState = 'Down';
      application.autoRefreshStream.onNext();

      expect(controller.selectedGroups[0].instances[0].healthState).toBe('Down');
    });

    it('re-retrieves instances when multiselectInstancesStream refreshes', function () {
      let application = { serverGroups: [this.serverGroupA, this.serverGroupB, this.serverGroupC]};
      this.addInstance(this.serverGroupA, 'i-234');
      this.createController(application);

      expect(controller.selectedGroups.length).toBe(1);
      expect(controller.selectedGroups[0].instances.length).toBe(1);

      this.addInstance(this.serverGroupA, 'i-123');
      // unchanged as stream hasn't emitted new value yet
      expect(controller.selectedGroups[0].instances.length).toBe(1);

      ClusterFilterModel.multiselectInstancesStream.onNext();

      expect(controller.selectedGroups[0].instances.length).toBe(2);
    });
  });

  describe('discovery actions', function () {
    beforeEach(function () {
      this.application = { serverGroups: [this.serverGroupA, this.serverGroupB, this.serverGroupC]};
    });

    it('can register with discovery when discovery is out of service for all selected instances', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'OutOfService'});
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'OutOfService'});
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canRegisterWithDiscovery()).toBe(true);
      expect(controller.canDeregisterWithDiscovery()).toBe(false);
    });

    it('can deregister with discovery when discovery is up for all selected instances', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'Up'});
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'Up'});
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canDeregisterWithDiscovery()).toBe(true);
      expect(controller.canRegisterWithDiscovery()).toBe(false);
    });

    it('has no discovery actions when some instance is not reporting discovery health', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'OutOfService'});
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canRegisterWithDiscovery()).toBe(false);
      expect(controller.canDeregisterWithDiscovery()).toBe(false);
    });

    it('has no discovery actions when instances have different discovery health states', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'Up'});
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        instance.health.push({type: 'Discovery', state: 'OutOfService'});
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canDeregisterWithDiscovery()).toBe(false);
      expect(controller.canRegisterWithDiscovery()).toBe(false);
    });
  });

  describe('load balancer actions', function () {
    beforeEach(function () {
      this.application = { serverGroups: [this.serverGroupA, this.serverGroupB, this.serverGroupC]};
      this.makeLoadBalancerHealth = () => {
        return {type: 'LoadBalancer', loadBalancers: [{name: 'lb-1'}, {name: 'lb-2'}]};
      };
      this.serverGroupA.loadBalancers = [ 'lb-1', 'lb-2' ];
      this.serverGroupB.loadBalancers = [ 'lb-2', 'lb-1' ];
    });

    it('can register with load balancers when server groups have the same load balancers and no instances have lb health', function () {
      this.serverGroupA.instances.forEach((instance) => this.addInstance(this.serverGroupA, instance.id));
      this.serverGroupB.instances.forEach((instance) => this.addInstance(this.serverGroupB, instance.id));
      this.createController(this.application);
      expect(controller.canRegisterWithLoadBalancers()).toBe(true);
    });

    it('cannot register with load balancers when server groups have the same load balancers but any instance has lb health', function () {
      this.serverGroupA.instances.forEach((instance) => this.addInstance(this.serverGroupA, instance.id));
      this.serverGroupB.instances.forEach((instance) => this.addInstance(this.serverGroupB, instance.id));
      this.serverGroupB.instances[0].health.push({type: 'LoadBalancer'});
      this.createController(this.application);
      expect(controller.canRegisterWithLoadBalancers()).toBe(false);
    });

    it('cannot register with load balancers when server groups have different load balancers', function () {
      this.serverGroupA.instances.forEach((instance) => this.addInstance(this.serverGroupA, instance.id));
      this.serverGroupB.instances.forEach((instance) => this.addInstance(this.serverGroupB, instance.id));
      this.serverGroupB.loadBalancers = [ 'lb-1', 'lb-3' ];
      this.createController(this.application);
      expect(controller.canRegisterWithLoadBalancers()).toBe(false);
    });

    it('cannot register with load balancers when server groups have no load balancers', function () {
      this.serverGroupA.instances.forEach((instance) => this.addInstance(this.serverGroupA, instance.id));
      this.serverGroupB.instances.forEach((instance) => this.addInstance(this.serverGroupB, instance.id));
      this.serverGroupA.loadBalancers = [];
      this.serverGroupB.loadBalancers = [];
      this.createController(this.application);
      expect(controller.canRegisterWithLoadBalancers()).toBe(false);
    });

    it('can deregister from load balancers when instances are registered with the all load balancers, which are the same', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canDeregisterFromLoadBalancers()).toBe(true);
    });

    it('cannot deregister from load balancers when some instance is not registered', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => this.addInstance(this.serverGroupB, instance.id));
      this.createController(this.application);
      expect(controller.canDeregisterFromLoadBalancers()).toBe(false);
    });

    it('cannot deregister from load balancers when some instance is registered with different load balancers', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        let health = this.makeLoadBalancerHealth();
        health.loadBalancers.push({name: 'lb-3'});
        instance.health.push(health);
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.createController(this.application);
      expect(controller.canDeregisterFromLoadBalancers()).toBe(false);
    });

    it('cannot deregister from load balancers when some server group has different load balancers', function () {
      this.serverGroupA.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupA, instance.id);
      });
      this.serverGroupB.instances.forEach((instance) => {
        instance.health.push(this.makeLoadBalancerHealth());
        this.addInstance(this.serverGroupB, instance.id);
      });
      this.serverGroupB.loadBalancers = [ 'lb-2', 'lb-1', 'lb-3' ];
      this.createController(this.application);
      expect(controller.canDeregisterFromLoadBalancers()).toBe(false);
    });
  });
});
