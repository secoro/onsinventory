package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.repository.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LocationController {

    private final LocationRepository locationRepository;

    public LocationController(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        List<Location> locations = locationRepository.findAll();
        return ResponseEntity.ok(locations);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocation(@PathVariable Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));
        return ResponseEntity.ok(location);
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        Location created = locationRepository.save(location);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @RequestBody Location locationData) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));

        if (locationData.getName() != null) location.setName(locationData.getName());
        if (locationData.getDescription() != null) location.setDescription(locationData.getDescription());
        if (locationData.getIcon() != null) location.setIcon(locationData.getIcon());

        Location updated = locationRepository.save(location);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        if (!locationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Location not found: " + id);
        }
        locationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
