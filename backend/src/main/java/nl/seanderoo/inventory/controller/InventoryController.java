package nl.seanderoo.inventory.controller;

import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
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
        return ResponseEntity.ok(inventoryService.getItem(id));
    }

    @GetMapping
    public ResponseEntity<List<InventoryItemDTO>> getAllItems() {
        return ResponseEntity.ok(inventoryService.getAllItems());
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItemDTO> updateItem(@PathVariable Long id, @RequestBody InventoryItemDTO dto) {
        return ResponseEntity.ok(inventoryService.updateItem(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
