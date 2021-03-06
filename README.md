# Node-RED Framework

This is a Node-RED based wireless experimentation framework used in the [eWINE project](https://ewine-project.eu/). It lists different Node-RED modules and experimentation flows that are used to solve wireless network problems.

## Node-RED Modules

The Node-RED modules built are used for intelligent wireless experimentation and they are categorized into planning, reasoning and miscellaneous nodes

### Planning Modules
[exhaustive-search](node-red-ewine/planning-exhaustive-search): plans an experiment at each and every parameter settings  
[file-search](node-red-ewine/planning-file-search): plans an experiment at selective parameter settings given by a file  
[LA](node-red-ewine/planning-LA): experiment planning using Locating Array (LA) Design  
[LHD](node-red-ewine/planning-LHD): experiment planning using Latin Hypercube Design (LHD)  
[random-search](node-red-ewine/planning-random-search): random experiment planning from the parameter design space

### Reasoning Modules
[analysis](node-red-ewine/reasoning-analysis): statistical analysis reasoning block  
[BFS-analysis](node-red-ewine/reasoning-BFS-analysis): Breadth-First Search (BFS) analysis block  
[dummy](node-red-ewine/reasoning-dummy): dummy reasoning block  
[model-creation](node-red-ewine/reasoning-model-creation): builds an accurate surrogate model of a black box system using FLOLA-Voronoi sampling strategy  
[optimization](node-red-ewine/reasoning-optimization): optimizes a black box system using surrogate models and Probability of Improvement (PoI) sampling strategy

### Miscellaneous Modules
[Cooja](node-red-ewine/miscellaneous-cooja): starts a cooja network simulator from [contiki](http://www.contiki-os.org/)  
[js2xml](node-red-ewine/miscellaneous-js2xml): renders json string into xml format  
[MATLABd](node-red-ewine/miscellaneous-MATLABd): creates a MATLAB daemon [program](https://github.com/mmehari/SUMO_optimization)  
[Mfile](node-red-ewine/miscellaneous-Mfile): Writes/Reads multiple messages to/from multiple files  
[split_WI](node-red-ewine/miscellaneous-split_WI): Split a message into multiple messages and send them with interval.  
[tcpClient](node-red-ewine/miscellaneous-tcpClient): sends TCP request messages to a server  
[UPI_exec](node-red-ewine/miscellaneous-UPI_exec): communicates to a WISHFUL enabled controller using Universal Programming Interface (UPI)


## Node-RED Flows

All Node-RED flows that are described here follow similar experimentation flow. There are three basic parts which are used for i) experiment setup and initialization ii) intelligent experimentation and iii) experiment action. Figure 1 shows the detail.

![Node-RED experimentation flow](node-red_flow.png)

*Figure 1. Node-RED experimentation flow*

i) The first part is where the experiment is setup and default parameters are initialized. Update the "Experiment Setup" function node to configure the experiment (i.e. modify sink_ID, source_ID and disturber_ID variables). You can also tweak ["Application", "Radio", "Custom"] "parameters" function nodes, to change the default network configuration before experiment starts.

ii)  After the experiment is setup and initialized, the wireless network will be in a default initial state and the experiment can proceed. The experiment is defined inside the "PUT" function node, which holds all the parameters under test. Next, the planner designs the experiment using the configuration space defined inside the "PUT" node. Each designed experiment is executed by the "PUT Exec" node, which is translated as a WHiSHFUL UPI call and a proper configuration on the devices under test. Afterwards, experiment results are collected by using the "Measurement" subflow. Measurement collection is translated as (a) reseting measurement results, (b) waiting for measurements to arrive and (c) collecting measurement results. Finally, the "Reasoning" block analyzes the result and either continues or stops the experiment execution.

iii) After experiment is finished, a final action can be performed, as simple as email notification or as complex as performance score calculation.


### Sample Demonstrators
[flows_WSN](flows_WSN.json): A WSN demonstrator flow  
[flows_PL](flows_PL.json): A Path Loss calculator flow  
[flows_Wi-Fi_conf_OPT](flows_Wi-Fi_conf_OPT.flow): Wi-Fi conference optimization flow  
[flows_DYN](flows_DYN.json): A dynamic WSN optimization flow  
[flows_sensys2017](flows_sensys2017.json): A WSN demonstrator flow used in sensys 2017 demo/poster session  
[flows_CNERT2018](flows_CNERT2018.json): A WSN demonstrator flow used in CNERT 2018 demo/poster session


## Contact

michael.mehari@ugent.be
