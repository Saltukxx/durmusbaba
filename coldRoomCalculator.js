const logger = require('./logger');

/**
 * Modern Cold Room Capacity Calculator
 * Implements industry-standard calculation methods for cold storage systems
 */

// Standard refrigeration temperature points with heat load coefficients (W/m³)
const TEMPERATURE_COEFFICIENTS = {
    12: { base: 45, infiltration: 0.8, product: 0.6 },    // Medium temp storage
    5: { base: 55, infiltration: 1.0, product: 0.8 },     // Fresh produce
    0: { base: 65, infiltration: 1.2, product: 1.0 },     // Meat/dairy
    [-5]: { base: 75, infiltration: 1.4, product: 1.2 },  // Short-term frozen
    [-15]: { base: 85, infiltration: 1.6, product: 1.4 }, // Frozen storage
    [-18]: { base: 90, infiltration: 1.8, product: 1.6 }, // Standard freezer
    [-20]: { base: 95, infiltration: 2.0, product: 1.8 }, // Deep freeze
    [-25]: { base: 105, infiltration: 2.2, product: 2.0 } // Ultra-low temp
};

// Product-specific heat load factors (kJ/kg·K)
const PRODUCT_HEAT_LOADS = {
    meat: { specific_heat: 3.2, density: 800 },
    fish: { specific_heat: 3.8, density: 750 },
    dairy: { specific_heat: 3.5, density: 850 },
    fruits: { specific_heat: 3.9, density: 600 },
    vegetables: { specific_heat: 4.0, density: 550 },
    frozen: { specific_heat: 2.1, density: 900 },
    beverages: { specific_heat: 4.1, density: 950 },
    general: { specific_heat: 3.5, density: 700 }
};

// Climate zone factors
const CLIMATE_FACTORS = {
    arctic: 0.85,     // Very cold climate
    temperate: 1.0,   // Moderate climate
    subtropical: 1.15, // Warm humid climate
    tropical: 1.3,    // Hot humid climate
    desert: 1.25      // Hot dry climate
};

/**
 * Calculate transmission heat load through walls, ceiling, and floor
 * @param {Object} dimensions - Room dimensions {length, width, height}
 * @param {Object} insulation - Insulation specs {wall_thickness, ceiling_thickness, floor_thickness}
 * @param {number} temp_diff - Temperature difference (ambient - room)
 * @returns {number} Transmission load in watts
 */
function calculateTransmissionLoad(dimensions, insulation, temp_diff) {
    const { length, width, height } = dimensions;
    
    // Surface areas
    const wall_area = 2 * (length * height + width * height);
    const ceiling_area = length * width;
    const floor_area = length * width;
    
    // U-values for different insulation thicknesses (W/m²·K)
    const getUValue = (thickness_mm) => {
        // Typical polyurethane insulation thermal conductivity: 0.026 W/m·K
        const thermal_conductivity = 0.026;
        const thickness_m = thickness_mm / 1000;
        return thermal_conductivity / thickness_m;
    };
    
    const wall_u = getUValue(insulation.wall_thickness || 100);
    const ceiling_u = getUValue(insulation.ceiling_thickness || 120);
    const floor_u = insulation.floor_thickness ? getUValue(insulation.floor_thickness) : 0.5; // No insulation penalty
    
    // Calculate heat loads
    const wall_load = wall_area * wall_u * temp_diff;
    const ceiling_load = ceiling_area * ceiling_u * temp_diff;
    const floor_load = floor_area * floor_u * temp_diff;
    
    return wall_load + ceiling_load + floor_load;
}

/**
 * Calculate infiltration heat load from door openings and air leakage
 * @param {Object} dimensions - Room dimensions
 * @param {number} door_openings - Daily door openings
 * @param {number} temp_diff - Temperature difference
 * @param {number} room_temp - Room temperature
 * @returns {number} Infiltration load in watts
 */
function calculateInfiltrationLoad(dimensions, door_openings, temp_diff, room_temp) {
    const volume = dimensions.length * dimensions.width * dimensions.height;
    
    // Air properties at room temperature
    const air_density = 1.225 - (room_temp * 0.004); // kg/m³
    const air_specific_heat = 1.006; // kJ/kg·K
    
    // Infiltration rate based on door openings (air changes per day)
    const base_air_changes = 0.5; // Natural leakage
    const door_air_changes = door_openings * 0.1; // 0.1 air change per opening
    const total_air_changes = base_air_changes + door_air_changes;
    
    // Convert to watts
    const infiltration_volume_per_second = (volume * total_air_changes) / (24 * 3600);
    const infiltration_load = infiltration_volume_per_second * air_density * air_specific_heat * temp_diff * 1000;
    
    return Math.max(infiltration_load, 0);
}

/**
 * Calculate product heat load from cooling warm products
 * @param {number} daily_load_kg - Daily product load in kg
 * @param {number} entry_temp - Product entry temperature
 * @param {number} room_temp - Room storage temperature
 * @param {string} product_type - Type of product
 * @param {number} cooling_time_hours - Time to cool products
 * @returns {number} Product load in watts
 */
function calculateProductLoad(daily_load_kg, entry_temp, room_temp, product_type, cooling_time_hours) {
    const product_props = PRODUCT_HEAT_LOADS[product_type] || PRODUCT_HEAT_LOADS.general;
    const temp_diff = Math.max(0, entry_temp - room_temp);
    
    if (temp_diff === 0 || daily_load_kg === 0) return 0;
    
    // Energy required to cool products (kJ)
    const cooling_energy = daily_load_kg * product_props.specific_heat * temp_diff;
    
    // Convert to average power over cooling period (watts)
    const cooling_time_seconds = cooling_time_hours * 3600;
    const average_power = (cooling_energy * 1000) / cooling_time_seconds;
    
    return average_power;
}

/**
 * Calculate equipment heat load from fans, lights, defrost systems
 * @param {Object} dimensions - Room dimensions
 * @param {Object} equipment - Equipment specifications
 * @returns {number} Equipment load in watts
 */
function calculateEquipmentLoad(dimensions, equipment = {}) {
    const volume = dimensions.length * dimensions.width * dimensions.height;
    const floor_area = dimensions.length * dimensions.width;
    
    let total_load = 0;
    
    // Evaporator fans (typical: 15-25 W per kW of cooling capacity)
    // Estimate: 5 W/m³ for small rooms, 3 W/m³ for large rooms
    const fan_load = volume < 100 ? volume * 5 : volume * 3;
    total_load += fan_load;
    
    // Lighting (LED: 10-15 W/m²)
    const lighting_load = floor_area * (equipment.lighting_watts_per_sqm || 12);
    total_load += lighting_load;
    
    // Defrost heaters (for freezer rooms only, typically 30% of evaporator capacity)
    // This is handled separately in the main calculation
    
    return total_load;
}

/**
 * Calculate total cooling capacity for a cold room
 * @param {Object} params - Calculation parameters
 * @returns {Object} Detailed calculation results
 */
function calculateColdRoomCapacity(params) {
    const {
        // Room specifications
        length = 10,
        width = 6,
        height = 3,
        temperature = -18,
        
        // Environmental conditions
        ambient_temperature = 35,
        climate_zone = 'temperate',
        humidity_factor = 1.0,
        
        // Insulation specifications
        wall_insulation = 100,    // mm
        ceiling_insulation = 120, // mm
        floor_insulation = 80,    // mm
        
        // Operational parameters
        door_openings_per_day = 10,
        daily_product_load = 500,  // kg
        product_entry_temperature = 20,
        product_type = 'general',
        cooling_time_hours = 24,
        
        // Safety and design factors
        safety_factor = 1.2,
        defrost_factor = 1.0,     // Additional factor for defrost cycles
        future_expansion = 1.0     // Factor for future capacity needs
    } = params;
    
    // Validate inputs
    if (!TEMPERATURE_COEFFICIENTS[temperature]) {
        throw new Error(`Unsupported temperature: ${temperature}°C. Supported: ${Object.keys(TEMPERATURE_COEFFICIENTS).join(', ')}`);
    }
    
    const dimensions = { length, width, height };
    const volume = length * width * height;
    const temp_diff = ambient_temperature - temperature;
    
    // Calculate individual heat loads
    const transmission_load = calculateTransmissionLoad(
        dimensions,
        {
            wall_thickness: wall_insulation,
            ceiling_thickness: ceiling_insulation,
            floor_thickness: floor_insulation
        },
        temp_diff
    );
    
    const infiltration_load = calculateInfiltrationLoad(
        dimensions,
        door_openings_per_day,
        temp_diff,
        temperature
    );
    
    const product_load = calculateProductLoad(
        daily_product_load,
        product_entry_temperature,
        temperature,
        product_type,
        cooling_time_hours
    );
    
    const equipment_load = calculateEquipmentLoad(dimensions);
    
    // Calculate base cooling load
    const base_load = transmission_load + infiltration_load + product_load + equipment_load;
    
    // Apply correction factors
    const climate_factor = CLIMATE_FACTORS[climate_zone] || CLIMATE_FACTORS.temperate;
    const corrected_load = base_load * climate_factor * humidity_factor;
    
    // Add defrost load for freezer rooms
    let defrost_load = 0;
    if (temperature <= 0) {
        defrost_load = corrected_load * 0.15 * defrost_factor; // 15% additional for defrost
    }
    
    // Calculate final capacity with safety factors
    const total_load = corrected_load + defrost_load;
    const final_capacity = total_load * safety_factor * future_expansion;
    
    // Calculate specific loads per unit
    const load_per_m3 = final_capacity / volume;
    const load_per_m2 = final_capacity / (length * width);
    
    return {
        // Main results
        total_capacity_watts: Math.round(final_capacity),
        total_capacity_kw: Math.round(final_capacity / 1000 * 100) / 100,
        load_per_m3: Math.round(load_per_m3),
        load_per_m2: Math.round(load_per_m2),
        
        // Detailed breakdown
        loads: {
            transmission: Math.round(transmission_load),
            infiltration: Math.round(infiltration_load),
            product: Math.round(product_load),
            equipment: Math.round(equipment_load),
            defrost: Math.round(defrost_load),
            base_total: Math.round(base_load),
            corrected_total: Math.round(corrected_load)
        },
        
        // Applied factors
        factors: {
            climate: climate_factor,
            humidity: humidity_factor,
            safety: safety_factor,
            defrost: defrost_factor,
            expansion: future_expansion,
            final_multiplier: climate_factor * humidity_factor * safety_factor * future_expansion
        },
        
        // Room specifications
        room: {
            volume: Math.round(volume * 100) / 100,
            dimensions: `${length}m × ${width}m × ${height}m`,
            temperature: temperature,
            ambient_temperature: ambient_temperature,
            temperature_difference: temp_diff
        },
        
        // System recommendations
        recommendations: generateSystemRecommendations(final_capacity, temperature, volume),
        
        // Input parameters (for reference)
        inputs: params
    };
}

/**
 * Generate system recommendations based on calculated capacity
 * @param {number} capacity_watts - Required cooling capacity
 * @param {number} temperature - Storage temperature
 * @param {number} volume - Room volume
 * @returns {Object} System recommendations
 */
function generateSystemRecommendations(capacity_watts, temperature, volume) {
    const capacity_kw = capacity_watts / 1000;
    
    let system_type;
    let compressor_type;
    let refrigerant_suggestion;
    let additional_notes = [];
    
    // System type recommendation
    if (capacity_kw < 5) {
        system_type = 'Monoblock Unit';
        additional_notes.push('Compact solution, easy installation');
    } else if (capacity_kw < 15) {
        system_type = 'Split System';
        additional_notes.push('Flexible installation, lower noise');
    } else if (capacity_kw < 50) {
        system_type = 'Multi-Split or Modular System';
        additional_notes.push('Redundancy and staged capacity control');
    } else {
        system_type = 'Central Refrigeration System';
        additional_notes.push('Custom engineered solution required');
    }
    
    // Compressor type recommendation
    if (capacity_kw < 3) {
        compressor_type = 'Hermetic Reciprocating';
    } else if (capacity_kw < 20) {
        compressor_type = 'Semi-hermetic Reciprocating';
    } else if (capacity_kw < 100) {
        compressor_type = 'Screw Compressor';
    } else {
        compressor_type = 'Centrifugal or Large Screw';
    }
    
    // Refrigerant suggestion
    if (temperature >= 0) {
        refrigerant_suggestion = 'R-134a, R-513A, or R-1234yf (HFO)';
    } else if (temperature >= -25) {
        refrigerant_suggestion = 'R-404A, R-448A, or R-449A';
        additional_notes.push('Consider natural refrigerants (CO2, NH3) for larger systems');
    } else {
        refrigerant_suggestion = 'R-404A or cascade system with CO2';
        additional_notes.push('Ultra-low temperature requires specialized design');
    }
    
    // Energy efficiency recommendations
    if (capacity_kw > 10) {
        additional_notes.push('Consider variable speed drives for energy efficiency');
    }
    
    if (temperature <= -15) {
        additional_notes.push('Electric or hot gas defrost system required');
    }
    
    return {
        system_type,
        compressor_type,
        refrigerant_suggestion,
        estimated_power_consumption: `${Math.round(capacity_kw * 0.8)}-${Math.round(capacity_kw * 1.2)} kW`,
        additional_notes
    };
}

/**
 * Quick calculation with simplified parameters
 * @param {number} volume - Room volume in m³
 * @param {number} temperature - Storage temperature in °C
 * @param {number} ambient_temp - Ambient temperature in °C
 * @returns {Object} Basic calculation results
 */
function quickCalculation(volume, temperature, ambient_temp = 35) {
    // Simplified calculation for quick estimates
    const temp_coeff = TEMPERATURE_COEFFICIENTS[temperature];
    if (!temp_coeff) {
        throw new Error(`Unsupported temperature: ${temperature}°C`);
    }
    
    const temp_diff = ambient_temp - temperature;
    const base_load_per_m3 = temp_coeff.base + (temp_diff - 35) * 0.5;
    const base_capacity = volume * base_load_per_m3;
    
    // Apply standard factors
    const safety_factor = 1.2;
    const final_capacity = base_capacity * safety_factor;
    
    return {
        total_capacity_watts: Math.round(final_capacity),
        total_capacity_kw: Math.round(final_capacity / 1000 * 100) / 100,
        load_per_m3: Math.round(final_capacity / volume),
        calculation_method: 'simplified'
    };
}

module.exports = {
    calculateColdRoomCapacity,
    quickCalculation,
    TEMPERATURE_COEFFICIENTS,
    PRODUCT_HEAT_LOADS,
    CLIMATE_FACTORS
};