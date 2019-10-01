# HKU Main Campus Map
# key:
# CPD = Centennial Building
# CB  = Chow Yei Ching Building
# COB = Composite Building
# HW  = Haking Wong Building
# KBS = Kadoorie Biological Sciences Building
# GH  = Graduate House
# JL  = James Hsioung Lee Science Building
# HC  = Hui Oi Chow Science Building
# LB  = Main Library
# MB  = Main Building
# KB  = Knowles Building
# RR  = Run Run Shaw Building
# RM  = Runme Shaw Building
# MW  = Meng Wah Complex Building
# CYA = Chong Yuet Ming Amenities Centre
# CYC = Chong Yuet Ming Chemistry Building
# CYP = Chong Yuet Ming Physics Building
# KK  = K.K. Leung Building
# FP  = Fung Ping Shan Building
# TT  = T.T. Tsui Building
# FS  = Fong Shu Chuen Amenities Centre
# TC  = Tang Chi Ngong Building

campus_map = {
    "CPD" : {
        "CB" : 2
    },
    "CB" : {
        "CPD" : 2,
        "COB" : 1
    },
    "COB" : {
        "CB" : 1,
        "HW" : 1
    },
    "HW" : {
        "COB" : 1,
        "JL" : 3,
        "HC" : 3,
        "LB" : 3,
        "KBS" : 2
    },
    "JL" : {
        "HW" : 3,
        "GH" : 2,
        "RR" : 1,
        "HC" : 1
    },
    "GH" : {
        "JL" : 2
    },
    "HC" : {
        "JL" : 1,
        "RR" : 1,
        "HW" : 3
    },
    "KBS" : {
        "HW" : 2,
        "LB" : 2
    },
    "LB" : {
        "KBS" : 2,
        "HW" : 3,
        "MB" : 2,
        "KB" : 2
    },
    "MB" : {
        "LB" : 2
    },
    "RR" : {
        "JL" : 1,
        "HC" : 1,
        "RM" : 1
    },
    "RM" : {
        "RR" : 1,
        "MW" : 2,
        "CYA" : 1
    },
    "MW" : {
        "RM" : 2,
        "CYA" : 1
    },
    "CYA" : {
        "MW" : 1,
        "RM" : 1,
        "KK" : 2,
        "CYP" : 2
    },
    "CYP" : {
        "CYA" : 2,
        "CYC" : 1
    },
    "CYC" : {
        "CYP" : 1
    },
    "KK" : {
        "CYA" : 2,
        "KB" : 1,
        "FP" : 2
    },
    "KB" : {
        "KK" : 1,
        "LB" : 2
    },
    "FP" : {
        "KK" : 2,
        "TT" : 1
    },
    "TT" : {
        "FP" : 1,
        "FS" : 1
    },
    "FS" : {
        "TT" : 1,
        "TC" : 1
    },
    "TC" : {
        "FS" : 1
    },
}