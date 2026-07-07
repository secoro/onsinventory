package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.repository.LocationRepository;
import nl.seanderoo.inventory.service.CurrentHouseholdProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationRepository locationRepository;
    private final CurrentHouseholdProvider currentHouseholdProvider;

    public LocationController(LocationRepository locationRepository, CurrentHouseholdProvider currentHouseholdProvider) {
        this.locationRepository = locationRepository;
        this.currentHouseholdProvider = currentHouseholdProvider;
    }

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        List<Location> locations = locationRepository.findAllByHouseholdId(currentHouseholdProvider.getHouseholdId());
        return ResponseEntity.ok(locations);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocation(@PathVariable Long id) {
        Location location = findOwnedLocation(id);
        return ResponseEntity.ok(location);
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        location.setHousehold(currentHouseholdProvider.getHousehold());
        Location created = locationRepository.save(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @RequestBody Location locationData) {
        Location location = findOwnedLocation(id);

        if (locationData.getName() != null) location.setName(locationData.getName());
        if (locationData.getDescription() != null) location.setDescription(locationData.getDescription());
        if (locationData.getIcon() != null) location.setIcon(locationData.getIcon());

        Location updated = locationRepository.save(location);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        Location location = findOwnedLocation(id);
        locationRepository.delete(location);
        return ResponseEntity.noContent().build();
    }

    private Location findOwnedLocation(Long id) {
        return locationRepository.findByIdAndHouseholdId(id, currentHouseholdProvider.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));
    }
}
