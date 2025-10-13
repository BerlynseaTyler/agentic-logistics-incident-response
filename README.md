# agentic-logistics-incident-response

# System Overview

____



# Implemententation Steps

## Multi-Agentic Workflow 
Multi-Agentic workflows using LLMs must be carefully prompt-engineered to ensure the desired output. Small language or verb changes can be the key to ensuring the agents run as desired with 99.99% accuracy. Multi-agentic workflow instructions must be carefully constructed in the order of execution, preferably given step numbers to ensure strict alignment, to ensure they run properly and accurately each time. If prompt language is ambigious, then agents are given the room to make assumptions in thought or reasoning, therefore allowing it to stray from the intended business objective of it's execution. Multi-agentic agents also must **not** apply any Output Transformation Strategy to the it's output to prevent data loss or data misconfiguration during data transfer from one tool to the next.

**Autonomous agentic workflows built to run without human supervision _must_ be built with each tool in _Autonomous Execution Mode_.**

### Delivery Delay Financial Analyzer

#### Key Agent Configuration Notes
- The agent **must** be instructed to `store information in memorory`, otherwise information gathered in earlier steps may be lost or misconfigured in later instructions.
- The agent **must** be instructed to `store the NUMERICAL VALUE OF` fields that are numerical-based for later pass into the Financial Impact Calculation script.
- The agent had to be specifically instructed to run the Financial Impact Caclulation script **seperately** for each option in the Proposed Routes field.
- The agent needed to be instructed to return the calculations in a specific format to ensure inclusion of all calculation results and prevent variations in the Calculated Impact output.
- The agent can be instructed to store the Sys_ID of created records for use in later tools.


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
Pull Delivery Delay Record | Record Operation | route_id | Route ID, Customer ID, Proposed Routes
Locate the Supply Agreement | Record Operation | customer_id | Customer ID, Delivery Window Hours, Stockout Penalty Rate
[Financial Impact Calculator](./Supporting%20Files/Financial%20Impact%20Calculation.js) | Script | eta_minutes, delivery_window_hours, stockout_penalty_rate | Numerical Calculations for Each Proposed Route Option | Agent stores this in Memory as "Calculated Impact" to pass to the next tools
Created Delayed Delivery Incident | Record Operation | route_id, customer_name, calculated impact | Agent stores created incident's Sys ID in memory | Agent sets the short description using the Customer Name and Route ID, assigns to Sales Systems Support, includes the Calculated Impact as the incident's description, and sets Urgency to 1-High and Impact to 3-Low _auto-setting Priority to 3-Moderate_ 
Update the Delivery Record | Record Operation | route_id, calculated_impact, incident_sys_id 
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

