(function(inputs) {
    // inputs expected: eta_minutes, delivery_window_hours, stockout_penalty_rate
    var etaMinutes = inputs.eta_minutes;
    var deliveryWindow = inputs.delivery_window_hours;
    var penaltyRate = inputs.stockout_penalty_rate;
    // Step 1: convert minutes to hours
    var etaHours = etaMinutes / 60;
    // Step 2: subtract the delivery window
    var overageHours = etaHours.toFixed(2) - deliveryWindow;
    // Step 3: multiply by penalty rate
    var calculatedImpact = overageHours * penaltyRate;
    return {
        calculated_impact: calculatedImpact.toFixed(2)
    };
})(inputs);
