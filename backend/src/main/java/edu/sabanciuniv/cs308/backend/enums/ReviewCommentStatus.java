package edu.sabanciuniv.cs308.backend.enums;

public enum ReviewCommentStatus {
    NONE,       // hiç yorum yok
    PENDING,    // PM onayı bekliyor
    APPROVED,   // onaylandı -> göster
    REJECTED    // reddedildi -> gösterme
}
