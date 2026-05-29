package nl.seanderoo.inventory.service;

import nl.seanderoo.inventory.dto.InventoryItemDTO;
import nl.seanderoo.inventory.exception.BadRequestException;
import nl.seanderoo.inventory.exception.ResourceNotFoundException;
import nl.seanderoo.inventory.model.InventoryItem;
import nl.seanderoo.inventory.model.Location;
import nl.seanderoo.inventory.repository.InventoryItemRepository;
import nl.seanderoo.inventory.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final LocationRepository locationRepository;

    public InventoryService(InventoryItemRepository inventoryItemRepository, LocationRepository locationRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.locationRepository = locationRepository;
    }

    public InventoryItemDTO addItem(InventoryItemDTO dto) {
        validateCreateRequest(dto);
        Location location = resolveLocation(dto.getLocation());

        InventoryItem item = InventoryItem.builder()
                .name(dto.getName())
                .category(dto.getCategory())
                .location(location)
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .expiryDate(dto.getExpiryDate())
                .notes(dto.getNotes())
                .build();

        InventoryItem saved = inventoryItemRepository.save(item);
        return toDTO(saved);
    }

    public InventoryItemDTO updateItem(Long id, InventoryItemDTO dto) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));

        if (dto.getName() != null) item.setName(dto.getName());
        if (dto.getCategory() != null) item.setCategory(dto.getCategory());
        if (dto.getQuantity() != null) item.setQuantity(dto.getQuantity());
        if (dto.getUnit() != null) item.setUnit(dto.getUnit());
        if (dto.getExpiryDate() != null) item.setExpiryDate(dto.getExpiryDate());
        if (dto.getNotes() != null) item.setNotes(dto.getNotes());
        if (dto.getLocation() != null) item.setLocation(resolveLocation(dto.getLocation()));

        InventoryItem updated = inventoryItemRepository.save(item);
        return toDTO(updated);
    }

    public void deleteItem(Long id) {
        if (!inventoryItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Item not found: " + id);
        }
        inventoryItemRepository.deleteById(id);
    }

    public InventoryItemDTO getItem(Long id) {
        return inventoryItemRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
    }

    public List<InventoryItemDTO> getAllItems() {
        return inventoryItemRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByLocation(String location) {
        Location loc = locationRepository.findByName(location)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + location));
        return inventoryItemRepository.findByLocationId(loc.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getItemsByCategory(String category) {
        return inventoryItemRepository.findByCategory(category).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> searchItems(String query) {
        return inventoryItemRepository.findByNameContainingIgnoreCase(query).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiringItems() {
        LocalDate soon = LocalDate.now().plusDays(3);
        return inventoryItemRepository.findExpiringSoonItems(LocalDate.now(), soon).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<InventoryItemDTO> getExpiredItems() {
        return inventoryItemRepository.findExpiredItems().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private InventoryItemDTO toDTO(InventoryItem item) {
        return InventoryItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .category(item.getCategory())
                .location(item.getLocation().getName())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .expiryDate(item.getExpiryDate())
                .addedDate(item.getAddedDate())
                .expired(item.isExpired())
                .expiringsoon(item.isExpiredOrExpiringSoon())
                .notes(item.getNotes())
                .build();
    }

    private void validateCreateRequest(InventoryItemDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Item name is required");
        }
        if (dto.getCategory() == null || dto.getCategory().isBlank()) {
            throw new BadRequestException("Category is required");
        }
        if (dto.getLocation() == null || dto.getLocation().isBlank()) {
            throw new BadRequestException("Location is required");
        }
        if (dto.getQuantity() == null || dto.getQuantity() <= 0) {
            throw new BadRequestException("Quantity must be greater than 0");
        }
        if (dto.getUnit() == null || dto.getUnit().isBlank()) {
            throw new BadRequestException("Unit is required");
        }
    }

    private Location resolveLocation(String locationName) {
        return locationRepository.findByName(locationName)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationName));
    }
}
