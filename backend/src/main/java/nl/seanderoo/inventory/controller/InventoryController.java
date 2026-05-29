package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*", maxAge = 3600)
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping
    public ResponseEntity<InventoryItemDTO> addItem(@RequestBody InventoryItemDTO dto) {
        InventoryItemDTO created = inventoryService.addItem(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItemDTO> getItem(@PathVariable Long id) {
        InventoryItemDTO item = inventoryService.getItem(id);
        return ResponseEntity.ok(item);
    }

    @GetMapping
    public ResponseEntity<List<InventoryItemDTO>> getAllItems() {
        List<InventoryItemDTO> items = inventoryService.getAllItems();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/location/{location}")
    public ResponseEntity<List<InventoryItemDTO>> getItemsByLocation(@PathVariable String location) {
        List<InventoryItemDTO> items = inventoryService.getItemsByLocation(location);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<InventoryItemDTO>> getItemsByCategory(@PathVariable String category) {
        List<InventoryItemDTO> items = inventoryService.getItemsByCategory(category);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/search")
    public ResponseEntity<List<InventoryItemDTO>> searchItems(@RequestParam String q) {
        List<InventoryItemDTO> items = inventoryService.searchItems(q);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/expiring")
    public ResponseEntity<List<InventoryItemDTO>> getExpiringItems() {
        List<InventoryItemDTO> items = inventoryService.getExpiringItems();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/expired")
    public ResponseEntity<List<InventoryItemDTO>> getExpiredItems() {
        List<InventoryItemDTO> items = inventoryService.getExpiredItems();
        return ResponseEntity.ok(items);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItemDTO> updateItem(@PathVariable Long id, @RequestBody InventoryItemDTO dto) {
        InventoryItemDTO updated = inventoryService.updateItem(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
