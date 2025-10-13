# agentic-logistics-incident-response
This multi-agentic ServiceNow workflow automates PepsiCo’s **supply chain incident triage and resolution** for delayed truck deliveries. The system integrates data from PepsiCo’s internal **Supply Agreement** and **Delivery Delay** tables, executes autonomous **AI agent workflows**, and coordinates external system communication via **n8n** webhooks and **MCP client tools** (Logistics, Retail, and ServiceNow endpoints).

# System Overview
The process begins when a new delayed delivery notification is received from Schneider, PepsiCo’s logistics provider. This event triggers the `Pending_Delivery_Delay` flow, which orchestrates two autonomous AI agents in sequence:

1. Delivery Delay Financial Analyzer
> Calculates the contractual financial impact of each proposed reroute option based on delivery windows and stockout penalty rates from customer supply agreements. The agent creates an incident record and updates the delivery delay record with the calculated impact.
2. Route Decision Agent
> Analyzes calculated impacts and delivery constraints to select the most cost-effective route, updates the corresponding ServiceNow records, and coordinates real-time execution through external systems. The agent then confirms dispatch completion before automatically resolving the associated incident.

![](https://github.com/BerlynseaTyler/agentic-logistics-incident-response/blob/main/Supporting%20Files/Photos/Architechture%20Diagram.jpg)

This agentic system leverages **memory-based data persistence**, strict prompt engineering, and **structured JSON payload desig**n to ensure consistent and lossless execution across multiple AI agents and tools, achieving near-zero human intervention in critical supply chain disruptions.

____

# Implemententation Components 
## PART 1: Application Tables 
### Delivery Delay Table
> This table stores all delivery delay notifications that are sent from PepsiCo's logistics provider, Schneider, to the ServiceNow platform.

Field Name | Example Data
-------------|------
Route ID | 717885
Customer ID | 1
Assigned To | 
Status | pending
Truck ID | 7923
Problem Description | Breakdown at I-80 MM 143 (engine)
Proposed Routes | [{"option_id": "opt-1", "route_number": 6, "distance_miles": 122, "eta_minutes": 460}, <br> {"option_id": "opt-2", "route_number": 14, "distance_miles": 109, "eta_minutes": 332}, <br> {"option_id": "opt-3", "route_number": 8, "distance_miles": 152, "eta_minutes": 551}]
Calculated Impact |
Chosen Option |
Incident Sys ID | 

### Supply Agreement Table
> This table stores all Customer Supply Agreement information for PepsiCo.

Field Name | Example Data
------|------
Customer ID | 1
Customer Name | Whole Foods
Delivery Window Hours | 3
Stockout Penalty Rate | 250

## PART 2: Multi-Agentic Workflow 
>  Multi-Agentic workflows using LLMs must be carefully prompt-engineered to ensure the desired output. Small language or verb changes can be the key to ensuring the agents run as desired with 99.99% accuracy. Multi-agentic workflow instructions must be carefully constructed in the order of execution, preferably given step numbers to ensure strict alignment, to ensure they run properly and accurately each time. If prompt language is ambigious, then agents are given the room to make assumptions in thought or reasoning, therefore allowing it to stray from the intended business objective of it's execution. Multi-agentic agents also must **not** apply any Output Transformation Strategy to the it's output to prevent data loss or data misconfiguration during data transfer from one tool to the next.

### Key Agentic Configuration & Prompt Engineering Notes
- **Autonomous agentic workflows _must_ be built with each tool in _Autonomous Execution Mode_.**
- The agent **must** be instructed to `store information in memorory`, otherwise information gathered in earlier steps may be lost or misconfigured in later instructions.
- The agent **must** be instructed to `store the NUMERICAL VALUE OF` fields that are numerical-based for later pass into the Financial Impact Calculation script.
- The agent had to be specifically instructed to run the Financial Impact Caclulation script **seperately** for each option in the Proposed Routes field.
- The agent needed to be instructed to return the calculations in a specific format to ensure inclusion of all calculation results and prevent variations in the Calculated Impact output.
- The agent can be instructed to store the Sys_ID of created records for use in later tools.
- Record Operation tools in this workflow must be instructed to return only 1 record – the exact match of the input/condition.
- Record Operation tools cannot both set new information to the field _and_ store the new value, so a seperate tool must be implemented to recieve the newely updated field values (_see Retrieve Webhook Value_).
- **Token Limit Safeguard**: To accommodate potential token exhaustion in AWS Bedrock during live demonstrations, a conditional instruction was added to the Route Decision Agent prompt. If no records are returned (e.g., due to model cutoff or incomplete execution), the workflow stops gracefully and delivers a friendly closing message. 

### USE CASE: Analyze Delivery Delays
> This use case is automatically triggered immediately when vendors relay a Delayed Delivery. This multi-agent workflow runs a cost analysis on alternative routes, makes a determination for which alternative route is best suited for PepsiCo business needs, then communicates the chosen route to external vendors to reroute PepsiCo deliveries without manual intervention.

#### Instructions 
````
When the trigger Pending_Delivery_Delay is activated, retrieve the Route ID from the record. You will run the Delivery Delay Financial Analyzer and then run the Route Decision Agent to select the most optimal alternative route. 

You are triggered by Pending_Delivery_Delay.
You will retrieve the Route ID from the record. 
Store this Route ID in memory to run both Agents. 
Use the tools as exactly as directed. 
Pass only numerical values of the inputs of the Financial Impact Tool. Do not pass in text. Only pass in numbers. 

1. Use Financial Analyzer to find the calculated impact of delivery delay. 
2. Use the Route Decision Agent to choose the most optimal route
````
#### Connected AI Agents
1. Delivery Delay Financial Analyzer
2. Route Decision Agent

#### Trigger
**Pending_Delivery_Delay**
- Trigger: `Created or Updated`
- Table: `Delivery Delay`
- Conditions: `Status is Pending`
- Run As: `Assigned To`
- Objective Template: `When records are created OR updated and Status = Pending on the table, store the record's ROUTE ID to memory and trigger the use case using the ROUTE ID.`

#### Display
Displays AI agent output in the Now Assist panel to Admins. 

### AGENT 1: Delivery Delay Financial Analyzer
> Analyzes the financial impact of delivery disruptions and creates incident tracking.
> 
#### Prompt Guidance
##### AI Agent Role
````
This agent's job is to use the Route ID to perform a financial impact calculation for each proposed route when a delivery is delayed. Then create an incident record, finally update the status of Delivery Record to "Calculated".
````
##### Instructions
````
First, perform Financial Impact Analysis.
Second, create Delayed Delivery incident.
Third, update the Delivery Delay record with the calculated impact.

1. Pull the Delayed Delivery details of the Route (Customer ID, Proposed Routes) and store this information in memory.

2. Use the Customer ID value of the Delayed Delivery to Locate the Supply Agreement for the Customer. Store the numerical value Customer's Delivery Window Hours and numerical value for Stockout Penalty Rate in memory.

FINANCIAL ANALYSIS INSTRUCTIONS
3.1 There are multiple options in the proposed routes. Store the numerical value of each ETA Minutes in memory.  
3.2 Run the Financial Impact Calculation tool separately for EACH of the delivery's proposed route option values. There will be a unique calculation for each of the ETA minutes.

4. Return the Calculation for each proposed route combined in **USD with $** in the output format "Alternative Route Option 1 Calculated Impact: , Alternative Route Option 2 Calculated Impact: " with a line break after each option. NOTE: IF THE CALCULATED IMPACT IS A NEGATIVE NUMBER, RETURN $0.00. This is the Calculated Impact. 
4.1 Store the Calculated Impact in memory. 

Use the Route ID, Customer Name, Problem Description, and Calculated Impact stored in memory to create the Delayed Delivery Incident record. In the Incident Description, insert a line break between {{problem_description}} and {{calculated_impact}}. Store the created Incident's Sys ID in memory.

Update the Delivery Delay record that matches the user provided Route ID with the Calculated Impact and the Incident Sys ID.
````
#### Agent Tools 
Tool Name | Tool Type | Inputs (AI) | Output (Field) | Notes
----------|-----------|--------|--------- | -----
Pull Delivery Delay Record | Record Operation (Lookup) | route_id | Route ID <br> Customer ID <br> Proposed Routes
Locate the Supply Agreement | Record Operation (Lookup) | customer_id | Customer ID <br> Delivery Window Hours <br> Stockout Penalty Rate
[Financial Impact Calculator](./Supporting%20Files/Financial%20Impact%20Calculation.js) | Script | eta_minutes <br> delivery_window_hours <br> stockout_penalty_rate | Penalty Amount for Each Proposed Route | Agent stores in Memory as "Calculated Impact" to pass as Input to the next tools
Created Delayed Delivery Incident (Create) | Record Operation | route_id <br> customer_name <br> calculated impact | Agent stores created incident's Sys ID in memory | Agent sets the short description using the **Customer Name** and **Route ID**, assigns to **Sales Systems Support**, includes the **Calculated Impact** as the incident's description, and sets Urgency to **1-High** and Impact to **3-Low** _auto-setting Priority to 3-Moderate_ 
Update the Delivery Record | Record Operation (Update) | route_id <br> calculated_impact <br> incident_sys_id | | Updates the Calculated Impact and Incident Sys ID fields, then changes Status to **Calculated**. 


### AGENT 2: Route Decision Agent
> Selects optimal routes and coordinate external execution.
> 
### Delivery Delay Financial Analyzer
#### Prompt Guidance
##### AI Agent Role
````
You use the Route ID to find the optimal route based on cost and time constraint, then update the Delivery Record, then update the incident's priority, then communicate the decision to via webhook.
````
##### Instructions
````
You will be provided with the Route ID.


1. Use the provided Route ID to Pull Delivery Delay Details.

2. Analyze the route options and select an option_id that optimizes the corresponding distance_miles and calculated_impact. Store the **entire route object** (including option_id, route_number, distance_miles, and eta_minutes) in your memory as Decision, not just the option_id string.
Decision must be a structured JSON object, not plain text.

3. Update Delivery Delay Record of Route ID with the entire Decision JSON object, 

4. Update the associated Incident record's Urgency based on financial severity. Use the following guidelines to set Urgency:
- If the option costs LESS than $500, then set Urgency to 3- Low.
- If the option costs BETWEEN $501-$1000, then set Urgency to 2- Medium.
- If the option costs MORE than $1000, then set Urgency to 1- High.

5. Retrieve Webhook Value. You will use this data to trigger the webhook.

6. Trigger n8n webhook with the Route ID and Retrieved Webhook Value.

PAUSE FLOW FOR 8 SECONDS. 

7. Run the Dispatched Status Checker on the Route ID. Store the Dispatched Status Checker's Chosen Option.
7.1 If no records returned, STOP WORKFLOW HERE and end interaction with this message: "Thank you for allowing the Delivery Delay Analyzer AI agents to resolve this incident autonomously The PepsiCo Way – fast and with a smile! This has been a demonstration of the future of artificial intelligence at PepsiCo. Have a beautiful day! 

8. Use the Incident Resolver with the Incident Sys Id and the Dispatched Status Checker's Chosen Option field.

9. End the interaction by thanking the user with this message: "Thank you for allowing the Delivery Delay Analyzer AI agents to resolve this incident autonomously The PepsiCo Way – fast and with a smile! Have a beautiful day!"
````
#### Agent Tools 
Tool Name | Tool Type | Input (AI) | Output (Fields) | Notes
----------|-----------|--------|--------- | -----
Pull Delivery Delay | Record Operation (Lookup) | route_id | Route ID <br> Calculated Impact <br> Incident Sys ID <br> Truck ID <br>Proposed Routes
Update Delivery Delay | Record Operation (Update) | route_id <br> decision (calculated by agent and stored in memory as JSON) | | Updates the Chosen Option field with Decision and changes Status to **Approved**. 
Update Incident Record | Record Operation (Update) | incident_sys_id <br> urgency (calculated by agent and stored in memory) | | Searches the Incident table by Sys ID – then updates Urgency, sets Impact to **1-High**, and sets Caller to **System Administrator**.
Retrieve Webhook Value | Record Operation (Lookup) | route_id | Route ID, Chosen Option
n8n Webhook | Script | route_id | | Conenected to n8n POST API endpoint. 
Pause Flow | Flow Action (Add a Pause) | Wait for 8 seconds. | | Input is placed in AI Instruction Description.
Dispatched Status Checker | Record Operation (Lookup) | route_id | Route ID <br> Status <br> Chosen Option | Condition is Status = **Dispatched**.
Incident Resolver | Record Operation (Update) | incident_sys_id <br> chosen_option | | Sets State to **Resolved**, Resolution Code to **Solution Provided**, Resolution Notes to **Dispatched Option: {{chosen_option}}**

## PART 3: n8n Communication Agent 
![](https://github.com/BerlynseaTyler/agentic-logistics-incident-response/blob/main/Supporting%20Files/Photos/n8n%20Workflow.png)
### Webhook
- HTTP Method: `POST`
- Respond: `Immediately`

### AI Agent 
- Source for Prompt `Define below`
- Prompt (User Message):
````
Connect to Logistics MCP Client Tool: execute_route – the payload is: 
{
  "route_id": "{{ $json.body.route_id }}",
  "truck_id": "{{ $json.body.truck_id }}",
  "chosen_option": {
    "option_id": "{{ $json.body.chosen_option.option_id }}",
    "route_number": {{ $json.body.chosen_option.route_number }},
    "distance_miles": {{ $json.body.chosen_option.distance_miles }},
    "eta_minutes": {{ $json.body.chosen_option.eta_minutes }}
  }
}

Connect to Retail MCP Client Tool: notify_delivery_delay – the payload is: {
  "route_id": "{{ $json.body.route_id }}",
  "truck_id": "{{ $json.body.truck_id }}",
  "chosen_option": {
    "option_id": "{{ $json.body.chosen_option.option_id }}",
    "route_number": {{ $json.body.chosen_option.route_number }},
    "distance_miles": {{ $json.body.chosen_option.distance_miles }},
    "eta_minutes": {{ $json.body.chosen_option.eta_minutes }}
  }
}

Connect to ServiceNow MCP Client Tool: update_execution_status – the payload is: {
  "route_id": {{ $json.body.route_id }},
  "status": Dispatched
}
````
- System Message: `You give JSON payloads to MCP tools.`

#### Chat Model: AWS BEDROCK
- Model Source: `On-Demand Models`
- Model: `open.ai.gpt-oss-120b-1:0` - selected for it's advanced ability to handle output to multiple tools.

#### Logistics MCP Client
- Endpoint: _Schneider's MCP Server_
- Server Transport: `HTTP Streamable`
- Tools to Include: `Selected`
- Tools to Include: `execute_route`

#### Retail MCP Client
- Endpoint: _Whole Food's MCP Server_
- Server Transport: `HTTP Streamable`
- Tools to Include: `Selected`
- Tools to Include: `notify_delivery_delay`

#### Retail MCP Client
- Endpoint: _PepsiCo's ServiceNow MCP Server_
- Server Transport: `HTTP Streamable`
- Authentication `Bearer Auth` - _needed to make updates to records in private, internal system._
- Tools to Include: `Selected`
- Tools to Include: `update_execution_status`
____

# Optimization 
Several key optimizations ensure that the multi-agentic flow runs reliably and aligns with real-world operational timing:
1. **8-Second Wait Period**
> After the **Route Decision Agent** triggers the external webhook (via n8n), the system waits eight seconds before continuing execution. This ensures that the downstream MCP clients (Logistics and Retail systems) have sufficient time to process the `execute_route` and `notify_delivery_delay` commands before ServiceNow checks for confirmation.
2. **Dispatched Status Check**
> Following the pause, the workflow runs a **Dispatched Status Checker** to verify whether the route was successfully updated to **Dispatched** in the Delivery Delay record. This real-time confirmation acts as a safety mechanism to prevent premature incident resolution or missed updates.
3. **Automated Incident Resolution**
> Once dispatch confirmation is detected, the system triggers the **Incident Resolver**, automatically updating the ServiceNow incident’s state to **Resolved**, inserting structured resolution notes that specify the executed route option. This eliminates manual intervention by support analysts, maintaining SLA compliance and operational transparency.
4. **Automatic Record Assignment for Trigger Activation**
> To guarantee consistent execution of the **Analyze Delivery Delays** use case, a supporting workflow — **Auto-Assign Sys Admin to Delays** — was introduced. This flow automatically assigns the **System Administrator** to any new Delivery Delay records created with a **Status is Pending**. Doing so ensures that each record meets the “Run As” requirement for agentic trigger activation, preventing missed executions due to unassigned records and maintaining 100% workflow reliability from the moment a delay notification enters ServiceNow.

Together, these optimizations bridge asynchronous webhook calls, data synchronization timing, and human-grade decision accuracy within an end-to-end automated resolution loop.
____

# Business Value
The automated incident workflow significantly enhances PepsiCo’s logistics resilience and operational efficiency:

#### Faster Response Time
> Reduces delay-to-resolution time from hours to minutes by autonomously analyzing impacts, selecting routes, and executing dispatches.
#### Reduced Financial Exposure
> Automatically calculates and mitigates potential stockout penalties by dynamically rerouting based on real-time financial impact data.
#### Operational Continuity
> Maintains uninterrupted product flow to key retail partners such as Whole Foods, avoiding costly SLA breaches and improving customer satisfaction.
#### Human Effort Reduction
> Replaces manual triage, financial computation, and routing coordination steps with fully automated workflows—freeing logistics and IT teams for higher-value work.
#### Auditability and Traceability
> Each agentic step, calculation, and webhook execution is recorded within ServiceNow, ensuring full visibility for internal auditing and compliance.

____
# Final Output 
![](https://github.com/BerlynseaTyler/agentic-logistics-incident-response/blob/main/Supporting%20Files/Photos/ServiceNow%20Execution.png)
____
# Future Optimizations
The next iteration of this multi-agentic workflow can introduce enhanced reliability and escalation logic by expanding post-webhook validation:

#### Webhook Connection Validation Logic
> After the initial 8-second wait, add a **secondary logic branch** to confirm that the n8n webhook successfully connected to all external MCP clients. This branch will validate response metadata for flags indicating transmission failure.
#### “Not Dispatched” Status Handling
> Introduce a new delivery status — e.g., **Not Dispatched** — to distinguish between a confirmed dispatch and a failed webhook transmission. This status prevents premature incident resolution.
#### Automated Escalation Path
> If the Webhook validation branch identifies a failure or detects “Not Dispatched,” automatically **escalate** the incident to a **Supply Chain Manager** for manual review and vendor follow-up. The escalation can include:
> - Assigning the incident to a specialized response group.
> - Sending a notification to logistics leadership.
> - Generating a ServiceNow task for supply chain recovery analysis.
#### Self-Healing Webhook Retry Mechanism (Future Stretch Goal)
> Implement a retry mechanism for transient webhook failures before escalation, allowing the workflow to self-recover without human input.


