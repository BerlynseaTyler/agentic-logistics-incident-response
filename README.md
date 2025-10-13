# agentic-logistics-incident-response

# System Overview

____



# Implemententation Steps
## Database Tables 
### Delivery Delay
This table stores all delivery delay notifications that are sent from PepsiCo's logistics provider, Schneider, to the ServiceNow platform.

Field Name | Example Data
___________|__________
Route ID |
Customer ID |
Assigned To |
Status | 
Truck ID |
Problem Description |
Proposed Routes |
Calculated Impact |
Chosen Option |
Incident Sys ID | 



## Multi-Agentic Workflow 
Multi-Agentic workflows using LLMs must be carefully prompt-engineered to ensure the desired output. Small language or verb changes can be the key to ensuring the agents run as desired with 99.99% accuracy. Multi-agentic workflow instructions must be carefully constructed in the order of execution, preferably given step numbers to ensure strict alignment, to ensure they run properly and accurately each time. If prompt language is ambigious, then agents are given the room to make assumptions in thought or reasoning, therefore allowing it to stray from the intended business objective of it's execution. Multi-agentic agents also must **not** apply any Output Transformation Strategy to the it's output to prevent data loss or data misconfiguration during data transfer from one tool to the next.

### Key Agentic Configuration & Prompt Engineering Notes
- **Autonomous agentic workflows _must_ be built with each tool in _Autonomous Execution Mode_.**
- The agent **must** be instructed to `store information in memorory`, otherwise information gathered in earlier steps may be lost or misconfigured in later instructions.
- The agent **must** be instructed to `store the NUMERICAL VALUE OF` fields that are numerical-based for later pass into the Financial Impact Calculation script.
- The agent had to be specifically instructed to run the Financial Impact Caclulation script **seperately** for each option in the Proposed Routes field.
- The agent needed to be instructed to return the calculations in a specific format to ensure inclusion of all calculation results and prevent variations in the Calculated Impact output.
- The agent can be instructed to store the Sys_ID of created records for use in later tools.
- Record Operation tools in this workflow must be instructed to return only 1 record – the exact match of the input/condition.
- Record Operation tools cannot both set new information to the field _and_ store the new value, so a seperate tool must be implemented to recieve the newely updated field values (_see Retrieve Webhook Value_). 

### Delivery Delay Financial Analyzer
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
Tool Name | Tool Type | Inputs | Outputs | Notes
----------|-----------|--------|--------- | -----
Pull Delivery Delay Record | Record Operation (Lookup) | route_id | Route ID, Customer ID, Proposed Routes
Locate the Supply Agreement | Record Operation (Lookup) | customer_id | Customer ID, Delivery Window Hours, Stockout Penalty Rate
[Financial Impact Calculator](./Supporting%20Files/Financial%20Impact%20Calculation.js) | Script | eta_minutes, delivery_window_hours, stockout_penalty_rate | Numerical Calculations for Each Proposed Route Option | Agent stores this in Memory as "Calculated Impact" to pass to the next tools
Created Delayed Delivery Incident (Create) | Record Operation | route_id, customer_name, calculated impact | Agent stores created incident's Sys ID in memory | Agent sets the short description using the **Customer Name** and **Route ID**, assigns to **Sales Systems Support**, includes the **Calculated Impact** as the incident's description, and sets Urgency to **1-High** and Impact to **3-Low** _auto-setting Priority to 3-Moderate_ 
Update the Delivery Record | Record Operation (Update) | route_id, calculated_impact, incident_sys_id | | Updates the Calculated Impact and Incident Sys ID fields, then changes Status to **Caclculated**. 


### Route Decision Agent 
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

8. Use the Incident Resolver with the Incident Sys Id and the Dispatched Status Checker's Chosen Option field.
````
#### Agent Tools 
Tool Name | Tool Type | Inputs | Outputs | Notes
----------|-----------|--------|--------- | -----
Pull Delivery Delay | Record Operation (Lookup) | route_id | Route ID, Calculated Impact, Incident Sys ID, Truck ID, Proposed Routes
Update Delivery Delay | Record Operation (Update) | route_id, decision (calculated by agent and stored in memory as JSON) | | Updates the Chosen Option field with Decision and changes Status to **Approved**. 
Update Incident Record | Record Operation (Update) | incident_sys_id, urgency (calculated by agent and stored in memory) | | Searches the Incident table by Sys ID – then updates Urgency, sets Impact to **1-High**, and sets Caller to **System Administrator**.
Retrieve Webhook Value | Record Operation (Lookup) | route_id | Route ID, Chosen Option
n8n Webhook | Script | route_id | | Conenected to n8n POST API endpoint. 

____

# Architecture Diagram


____

# Optimization 


____

# Testing Results


____

# Business Value


____

# Future Optimizations

